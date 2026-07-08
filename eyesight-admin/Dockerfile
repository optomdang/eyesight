# ========================
# Stage 1: Build app
# ========================
FROM node:20 AS builder

# Tạo thư mục app
WORKDIR /app

# Copy dependency files trước
COPY package.json package-lock.json .npmrc ./

# Cài dependencies
RUN npm install --frozen-lockfile

# Copy toàn bộ source code
COPY . .

# Build production
RUN npm run build


# =========================
# Stage 2: Serve with Nginx
# =========================
FROM nginx:alpine

# Copy cấu hình Nginx tùy chỉnh (nếu có)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built app từ stage trước
COPY --from=builder /app/dist /usr/share/nginx/html

# Mở port
EXPOSE 80

# Command mặc định
CMD ["nginx", "-g", "daemon off;"]
