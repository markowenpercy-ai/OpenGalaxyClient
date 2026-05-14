import os
import requests
import sys
import subprocess
import json
from flask import Flask, request, session, jsonify, send_from_directory, Response

app = Flask(__name__, static_folder="dist", template_folder="dist")
app.secret_key = os.environ.get("FLASK_SECRET_KEY", os.environ.get("SECRET_KEY", "dev-secret-key-change-in-production"))

API_BASE = os.environ.get("API_BASE", "http://localhost:9090")
GAME_IP = os.environ.get("GAME_IP", "localhost")
PORT = int(os.environ.get("PORT", 8080))
CDN_BASE_URL = os.environ.get("CDN_BASE_URL", "")
CMD_EXEC = os.environ.get("CMD_EXEC", "cmd-exec.py")
LOG_DIR = os.environ.get("LOG_DIR", os.path.join(os.path.dirname(os.path.abspath(__file__)), "logs"))
CLIENT_DIR_LOCAL = os.environ.get("CLIENT_DIR", "/home/Delk/Desktop/WORKING FOLDER ROCK/client")

CLIENT_DIR = os.path.dirname(os.path.abspath(__file__))

print(f"[INIT] API_BASE={API_BASE}, GAME_IP={GAME_IP}, PORT={PORT}, LOG_DIR={LOG_DIR}")

# --- helpers ---

def get_token():
    """Get token from Flask session or Authorization header (for admin.html compat)."""
    if "token" in session:
        return session["token"]
    auth_header = request.headers.get("Authorization")
    if auth_header:
        return auth_header
    return None

def api_post(endpoint, json=None, token=None):
    headers = {}
    if token:
        headers["Authorization"] = token
    headers["Content-Type"] = "application/json"
    try:
        resp = requests.post(
            f"{API_BASE}{endpoint}", json=json, headers=headers, timeout=10
        )
        return resp.json()
    except Exception as e:
        print(f"[API POST] Error: {e}")
        return {"error": str(e)}

def api_get(endpoint, token=None):
    headers = {}
    if token:
        headers["Authorization"] = token
    try:
        resp = requests.get(f"{API_BASE}{endpoint}", headers=headers, timeout=10)
        return resp.json()
    except Exception as e:
        print(f"[API GET] Error: {e}")
        return {"error": str(e)}

# --- auth routes ---

@app.route("/api/register", methods=["POST"])
def api_register():
    data = request.json
    result = api_post(
        "/login/register/account",
        {
            "email": data.get("email"),
            "username": data.get("username"),
            "password": data.get("password"),
            "captcha": data.get("captcha", "test"),
        },
    )
    if "message" in result and "COMPLETED" in result["message"]:
        return jsonify({"success": True})
    return jsonify({"error": result.get("message", "Registration failed")}), 400

@app.route("/api/login", methods=["POST"])
def api_login():
    data = request.json
    result = api_post(
        "/login/login/account",
        {"username": data.get("username"), "password": data.get("password")},
    )
    if result.get("message") == "LOGIN_COMPLETED":
        token = result["data"]["token"]
        users_result = api_get("/account/list/user", token)
        users = users_result.get("data", []) if users_result.get("data") else []
        session["token"] = token
        session["users"] = users
        session["username"] = data.get("username")
        return jsonify({"success": True, "token": token, "users": users})
    return jsonify({"error": result.get("message", "Login failed")}), 401

@app.route("/api/play-user", methods=["POST"])
def api_play_user():
    token = get_token()
    if not token:
        return jsonify({"error": "Not authenticated"}), 401
    user_id = request.json.get("userId")
    result = api_get(f"/account/play/user/{user_id}", token)
    if result.get("message") == "OK":
        session["userId"] = result["data"]["userId"]
        session["sessionKey"] = result["data"]["sessionKey"]
        return jsonify(
            {
                "success": True,
                "userId": result["data"]["userId"],
                "sessionKey": result["data"]["sessionKey"],
            }
        )
    return jsonify({"error": result.get("message", "Play failed")}), 400

@app.route("/api/logout", methods=["POST", "GET"])
def api_logout():
    session.clear()
    return jsonify({"success": True})

@app.route("/api/status")
def api_status():
    online_players = 0
    try:
        server_status = api_get("/metrics/online")
        if server_status and server_status.get("data"):
            online_players = server_status["data"].get("online", 0)
    except:
        pass

    backend_alive = False
    try:
        health = api_get("/metrics/online")
        backend_alive = True
    except:
        pass

    return jsonify(
        {
            "authenticated": "token" in session or bool(request.headers.get("Authorization")),
            "username": session.get("username"),
            "users": session.get("users", []),
            "gameIp": GAME_IP,
            "cdnUrl": CDN_BASE_URL,
            "onlinePlayers": online_players,
            "backendAlive": backend_alive,
            "backendUrl": API_BASE,
        }
    )

@app.route("/api/users")
def api_users():
    token = get_token()
    if not token:
        return jsonify({"error": "Not authenticated"}), 401
    return jsonify({"users": session.get("users", [])})

@app.route("/api/accounts/list/user")
@app.route("/api/account/list/user")
def api_list_users():
    token = get_token()
    if not token:
        return jsonify({"error": "Not authenticated"}), 401
    result = api_get("/account/list/user", token)
    if result.get("code") == 200 or result.get("message") == "OK":
        session["users"] = result.get("data", [])
        return jsonify({"code": 200, "data": result.get("data", [])})
    return jsonify(result)

@app.route("/api/accounts/create/user", methods=["POST"])
@app.route("/api/account/create/user", methods=["POST"])
def api_create_user():
    token = get_token()
    if not token:
        return jsonify({"error": "Not authenticated"}), 401
    data = request.json
    result = api_post("/account/create/user", data, token)
    if result.get("message") == "CREATE_COMPLETED":
        users_result = api_get("/account/list/user", token)
        users = users_result.get("data", []) if users_result.get("data") else []
        session["users"] = users
        return jsonify({"success": True, "users": users})
    return jsonify({"error": result.get("message", "Create failed")}), 400

# --- admin routes ---

@app.route("/api/cmd/execute", methods=["POST"])
def api_cmd_execute():
    body = request.json
    if not body or not body.get("command"):
        return jsonify({"error": "command required"}), 400

    token = body.get("auth_token") or get_token()
    if not token:
        return jsonify({"error": "Not authenticated"}), 401

    user_id = body.get("user_id", 0)
    guid = body.get("guid", 1)

    try:
        result = subprocess.run(
            [sys.executable, os.path.join(CLIENT_DIR, CMD_EXEC), token, str(user_id), str(guid), body["command"]],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode == 0:
            try:
                data = json.loads(result.stdout.strip().split("\n")[-1])
                return jsonify(data)
            except:
                return jsonify({"output": result.stdout.strip()})
        else:
            return jsonify({"error": result.stderr.strip() or "Command execution failed"}), 500
    except subprocess.TimeoutExpired:
        return jsonify({"error": "Command timed out"}), 504
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/logs/<path:filename>")
def serve_logs(filename):
    import os
    fpath = os.path.normpath(os.path.join(LOG_DIR, filename))
    if fpath.startswith(LOG_DIR) and os.path.isfile(fpath):
        try:
            with open(fpath, "r", errors="replace") as f:
                data = f.read()
            resp = Response(data, mimetype="text/plain; charset=utf-8")
            resp.headers["Access-Control-Allow-Origin"] = "*"
            return resp
        except:
            return Response("Log file too large", status=413)
    return jsonify({"error": "Log not found"}), 404

@app.route("/backend/<path:path>", methods=["GET", "POST", "PUT", "DELETE"])
def proxy_backend(path):
    endpoint = "/" + path
    token = request.headers.get("Authorization")
    body = request.get_json(silent=True)
    method = request.method

    try:
        if method == "GET":
            result = api_get(endpoint, token)
        else:
            result = api_post(endpoint, body, token)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/admin")
@app.route("/admin.html")
def serve_admin():
    return send_from_directory(os.path.join(CLIENT_DIR, "dist"), "admin.html")

# --- client file serving (backward compat with old working folder) ---
@app.route("/client/<path:filename>")
def serve_old_client(filename):
    return send_from_directory(CLIENT_DIR_LOCAL, filename)

# --- static assets ---

@app.route("/scripts/loader.js")
def serve_loader():
    return send_from_directory(os.path.join(CLIENT_DIR, "scripts"), "loader.js")

@app.route("/PreLoader.swf")
def serve_preloader():
    file_path = os.path.join(CLIENT_DIR, "PreLoader.swf")
    with open(file_path, 'rb') as f:
        data = f.read()
    response = Response(data, mimetype='application/x-shockwave-flash')
    response.headers['Content-Length'] = len(data)
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    response.headers['X-Accel-Buffering'] = 'no'
    return response

@app.route("/data/config.xml")
def serve_config():
    import xml.etree.ElementTree as ET
    config_path = os.path.join(CLIENT_DIR, "data", "config.xml")
    with open(config_path, 'r', encoding='utf-8') as f:
        content = f.read()

    if CDN_BASE_URL:
        tree = ET.parse(config_path)
        root = tree.getroot()
        resources = root.find('resources')
        if resources is not None:
            cdn = CDN_BASE_URL.rstrip('/') + '/'
            resources.set('path', cdn)
            xml_str = ET.tostring(root, encoding='unicode')
            return app.response_class(
                response=xml_str,
                status=200,
                mimetype='application/xml'
            )

    return send_from_directory(os.path.join(CLIENT_DIR, "data"), "config.xml")

@app.route("/asset/<path:filename>")
def serve_swf_files(filename):
    return send_from_directory(os.path.join(CLIENT_DIR, "asset"), filename)

@app.route("/images/<path:filename>")
def serve_images(filename):
    return send_from_directory(os.path.join(CLIENT_DIR, "images"), filename)

@app.route("/css/<path:filename>")
def serve_css(filename):
    return send_from_directory(os.path.join(CLIENT_DIR, "dist"), "assets" if filename.startswith("assets/") else filename, request.path[1:] if not filename.startswith("assets/") else filename)

@app.route("/play-all")
def play_all():
    users = session.get("users", [])
    if not users:
        return jsonify({"error": "Not authenticated"}), 401

    if len(users) == 1:
        return f"""<!DOCTYPE html>
<html>
<head>
    <title>OpenGalaxy - Launching Planet</title>
    <meta http-equiv="refresh" content="0;url=/play/{users[0].get('userId')}" />
</head>
<body>
    <p>Opening planet...</p>
</body>
</html>"""

    user_data = []
    for i, user in enumerate(users):
        user_data.append({
            "userId": user.get("userId"),
            "username": user.get("username", f"Planet {i+1}")
        })

    html = f"""<!DOCTYPE html>
<html>
<head>
    <title>OpenGalaxy - Launching Planets</title>
    <style>
        body {{ background: #0a0a0f; color: #fff; font-family: Arial, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }}
        .container {{ text-align: center; }}
        h1 {{ color: #00d4ff; margin-bottom: 20px; }}
        p {{ color: #aaa; margin-bottom: 30px; }}
        .planet {{ display: inline-block; padding: 15px 25px; margin: 10px; background: rgba(0,212,255,0.1); border: 1px solid #00d4ff; border-radius: 8px; color: #00d4ff; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>OpenGalaxy</h1>
        <p>Opening {len(user_data)} planets in new tabs...</p>
        <div>
"""
    for user in user_data:
        html += f'            <div class="planet">{user["username"]}</div>\n'

    html += """        </div>
    </div>
    <script>
        const users = """ + str(user_data).replace("'", "\\'") + """;
        users.forEach((user, index) => {
            setTimeout(() => {
                window.open('/play/' + user.userId, '_blank_' + index);
            }, index * 500);
        });
        setTimeout(() => { window.close(); }, users.length * 500 + 1000);
    </script>
</body>
</html>"""
    return html

@app.route("/")
def index():
    return send_from_directory(os.path.join(CLIENT_DIR, "dist"), "index.html")

@app.route("/assets/<path:filename>")
def serve_assets(filename):
    return send_from_directory(os.path.join(CLIENT_DIR, "dist", "assets"), filename)

@app.route("/<path:path>")
def serve_static(path):
    file_path = os.path.join(os.path.join(CLIENT_DIR, "dist"), path)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return send_from_directory(os.path.join(CLIENT_DIR, "dist"), path)
    return send_from_directory(os.path.join(CLIENT_DIR, "dist"), "index.html")

@app.after_request
def add_cors(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    return response

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT, debug=False)
