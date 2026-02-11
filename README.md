# 🚀 RoAP
A lightweight proxy server designed to overcome Roblox [HttpService](https://create.roblox.com/docs/reference/engine/classes/HttpService) limitations on internal API endpoints

# ⚙️ Installation
Follow these steps to install and run the project

## Step 1: Clone the repository
```
git clone https://github.com/VoxLenox/RoAP.git
cd RoAP
```

## Step 2: Set up and build the project
```
npm run setup
npm run build
```

## Step 3: Configure the environment file
Create and configure the `.env` file with the required values

## Step 4: Start the server
```
npm run start:prod
```

# ❓ Usages
You can make requests to almost any Roblox API endpoint through a single domain. All request data including headers and body will be forwarded to the target Roblox API endpoint

### Example
```
https://api.roblox.com/v1/example
```

becomes

```
http://yourdomain/api/v1/example
```

## Bypassing blocked headers
Some headers are blocked by Roblox `HttpService`. You can bypass these restrictions by prefixing the header name with a `$`
The proxy server will remove the `$` before forwarding the request. If the same header was already set, this method will overwrite the existing value

### Example
```
User-Agent: roap
```

should be

```
$User-Agent: roap
```
