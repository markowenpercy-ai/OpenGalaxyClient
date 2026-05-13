FROM python:3.11-slim

WORKDIR /app

# Install Node.js 18.x LTS
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt-lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY package.json package-lock.json* ./
RUN npm install && npm cache clean --force

COPY . .

RUN npm run build

EXPOSE 5001

ENV PORT=5001
ENV PYTHONUNBUFFERED=1

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl -f http://localhost:5001 || exit 1

CMD ["python", "main.py"]
