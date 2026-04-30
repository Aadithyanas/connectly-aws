# Use the official Node.js 20 image as the base
FROM node:20-slim

# Create and set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the TypeScript code
RUN npm run build

# Expose the port the app runs on
EXPOSE 4002

# Define the command to run the app
CMD ["npm", "start"]
