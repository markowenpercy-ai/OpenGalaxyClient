#!/usr/bin/env python3
"""Execute in-game chat commands via the game TCP protocol."""

import socket
import struct
import json
import sys
import urllib.request
import urllib.error

BACKEND = "http://localhost:9090"
GAME_HOST = "127.0.0.1"
GAME_PORT = 5051  # game server (via game-proxy on 5050)

def rest_get(path, token=None):
    req = urllib.request.Request(BACKEND + path)
    if token:
        req.add_header("Authorization", token)
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

def rest_post(path, body, token=None):
    data = json.dumps(body).encode()
    req = urllib.request.Request(BACKEND + path, data=data, method="POST")
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", token)
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

def build_login_packet(seq_id, user_id, session_key):
    """Build PlayerLoginTolPacket (TYPE 502)."""
    buf = bytearray()
    # SmartString: raw UTF-8 bytes, padded with zeros to 128
    sk_bytes = session_key.encode("utf-8")
    sk_padded = sk_bytes + b"\x00" * (128 - len(sk_bytes))
    # SmartString registerName (32 bytes, empty)
    rn_padded = b"\x00" * 32

    payload = struct.pack("<i", seq_id)       # seqId (int)
    payload += struct.pack("<q", user_id)      # userId (long)
    payload += sk_padded                        # sessionKey (128 bytes)
    payload += struct.pack("<i", -1)           # serverId = -1
    payload += struct.pack("<i", 0)            # flag
    payload += rn_padded                        # registerName (32 bytes)

    size = 4 + len(payload)
    ptype = 502
    packet = struct.pack("<HH", size, ptype) + payload
    return packet

def recv_exact(sock, n):
    data = bytearray()
    while len(data) < n:
        chunk = sock.recv(n - len(data))
        if not chunk:
            return None
        data.extend(chunk)
    return bytes(data)

def build_chat_packet(command, user_id=1, guid=1, char_name="Admin"):
    """Build ChatMessagePacket (TYPE 1600) with the given command string."""
    def wide_str(s, limit):
        """Encode string as UTF-16LE, padded to limit*2 bytes."""
        encoded = s.encode("utf-16-le")
        if len(encoded) > limit * 2:
            encoded = encoded[:limit * 2]
        return encoded + b"\x00" * ((limit * 2) - len(encoded))

    payload = struct.pack("<i", 0)                       # seqId
    payload += struct.pack("<q", user_id)                # srcUserId
    payload += struct.pack("<q", 0)                      # objUserId
    payload += struct.pack("<i", guid)                   # guid
    payload += struct.pack("<i", 0)                      # objGuid
    payload += struct.pack("<h", 1)                      # channelType (short)
    payload += struct.pack("<h", 0)                      # specialType (short)
    payload += struct.pack("<i", 0)                      # propsId
    payload += wide_str("", 64)                          # corpAcronym (64 wide chars)
    payload += struct.pack("<i", 0)                      # acronym
    payload += struct.pack("<i", 0)                      # rank
    payload += wide_str(char_name, 32)                   # name (32 wide chars)
    payload += wide_str("", 32)                          # toName (32 wide chars)
    payload += wide_str(command, 128)                    # buffer (128 wide chars) = THE COMMAND

    size = 4 + len(payload)
    ptype = 1600
    packet = struct.pack("<HH", size, ptype) + payload
    return packet

def execute_command(auth_token, user_id, guid, command):
    print(f"Getting play session for user {user_id}...")
    play_data = rest_get(f"/account/play/user/{user_id}", auth_token)
    if play_data.get("code") != 200:
        return {"error": f"Play session failed: {play_data.get('message', 'unknown')}"}

    session_key = play_data["data"]["sessionKey"]
    print(f"Session key obtained: {session_key[:20]}...")

    print(f"Connecting to game server {GAME_HOST}:{GAME_PORT}...")
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(15)
    try:
        sock.connect((GAME_HOST, GAME_PORT))
    except Exception as e:
        return {"error": f"Connection failed: {e}"}

    # Send login packet (TYPE 502)
    login_pkt = build_login_packet(0, user_id, session_key)
    print(f"Sending login packet ({len(login_pkt)} bytes)...")
    sock.sendall(login_pkt)

    # Receive login response (TYPE 504)
    header = recv_exact(sock, 4)
    if not header:
        return {"error": "No response to login"}
    resp_size, resp_type = struct.unpack("<HH", header)
    payload = recv_exact(sock, resp_size - 4)
    if not payload:
        return {"error": "Incomplete login response"}
    print(f"Login response: type={resp_type}, size={resp_size}")

    # Send game server login (TYPE 503)
    gs_payload = struct.pack("<i", 0)   # seqId
    gs_payload += struct.pack("<q", user_id)  # userId
    # session key twice (as seen in captured packets)
    sk_bytes = session_key.encode("utf-8")
    sk_padded = sk_bytes + b"\x00" * (128 - len(sk_bytes))
    gs_payload += sk_padded
    gs_payload += sk_padded
    gs_payload += b"\x00" * 2  # padding
    gs_size = 4 + len(gs_payload)
    gs_pkt = struct.pack("<HH", gs_size, 503) + gs_payload
    print(f"Sending game server login ({len(gs_pkt)} bytes)...")
    sock.sendall(gs_pkt)

    # Receive ack (TYPE 505)
    header = recv_exact(sock, 4)
    if not header:
        return {"error": "No ack"}
    ack_size, ack_type = struct.unpack("<HH", header)
    recv_exact(sock, ack_size - 4)
    print(f"Game login ack: type={ack_type}")

    # Send keep-alive ack (TYPE 1017)
    ka_payload = struct.pack("<i", 1) + struct.pack("<i", 2) + struct.pack("<i", 1)
    ka_pkt = struct.pack("<HH", 4 + len(ka_payload), 1017) + ka_payload
    sock.sendall(ka_pkt)

    # Receive response
    header = recv_exact(sock, 4)
    if header:
        rt_size, rt_type = struct.unpack("<HH", header)
        recv_exact(sock, rt_size - 4)
        print(f"Post-login response: type={rt_type}")

    # Send the chat command (TYPE 1600)
    chat_pkt = build_chat_packet(command, user_id, guid, "Admin")
    print(f"Sending chat command ({len(chat_pkt)} bytes): {command}")
    sock.sendall(chat_pkt)

    # Read response
    try:
        header = recv_exact(sock, 4)
        if header:
            r_size, r_type = struct.unpack("<HH", header)
            r_data = recv_exact(sock, r_size - 4)
            print(f"Command response: type={r_type}, size={r_size}")
        else:
            print("No response packet")
    except Exception as e:
        print(f"Response read: {e}")

    sock.close()
    return {"success": True, "command": command}

def main():
    if len(sys.argv) < 5:
        print("Usage: cmd-exec.py <auth_token> <user_id> <guid> <command>")
        sys.exit(1)

    auth_token = sys.argv[1]
    user_id = int(sys.argv[2])
    guid = int(sys.argv[3])
    command = sys.argv[4]

    result = execute_command(auth_token, user_id, guid, command)
    print(json.dumps(result))

if __name__ == "__main__":
    main()
