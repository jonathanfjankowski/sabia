# Dockerfile para o Frontend React (Sabiá Frontend)

FROM node:20-alpine

WORKDIR /app

# Copiar package.json e package-lock.json
COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar arquivos da aplicação (será sobrescrito pelo volume)
COPY . .

# Expor porta do Vite
EXPOSE 5173

# Comando padrão
CMD ["npm", "run", "dev"]
