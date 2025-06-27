# Quick Setup Guide - Enhanced n8n MCP Server

## 🚀 Quick Start (5 Minutes)

### **1. Prerequisites**
- Node.js 18+ installed
- n8n instance running (local or remote)
- n8n API key generated

### **2. Environment Configuration**
Create `.env` file in project root:
```env
N8N_API_URL=http://localhost:5678/api/v1
N8N_API_KEY=your_n8n_api_key_here
DEBUG=true
```

**Get your n8n API key:**
1. Open n8n (usually `http://localhost:5678`)
2. Go to Settings → API Keys
3. Click "Create API Key"
4. Copy the key to your `.env` file

### **3. Install & Start**
```bash
npm install
npm run build
npm start
```

### **4. Verify Success**
You should see:
```
Starting n8n MCP Server...
Verifying n8n API connectivity...
Successfully connected to n8n API at http://localhost:5678/api/v1
```

## 🔧 Claude Desktop Integration

Add to your `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "n8n-control": {
      "command": "node",
      "args": ["/path/to/n8n-mcp-server/build/index.js"],
      "env": {
        "N8N_API_URL": "http://localhost:5678/api/v1",
        "N8N_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

## ✅ What You Get

### **19 Available Tools**
- **7 Core Workflow Tools** (list, get, create, update, delete, activate, deactivate)
- **5 Node Tools** (add, delete, update name/parameters, move)
- **2 Connection Tools** (add, remove connections)
- **1 Bulk Tool** (update multiple nodes)
- **4 Execution Tools** (list, get, delete, run webhook)

### **Key Features**
- ✅ **No API Errors** - All read-only field issues resolved
- ✅ **Granular Operations** - Update individual nodes/connections
- ✅ **Smart Validation** - Prevents invalid workflows
- ✅ **Automatic Cleanup** - Removes orphaned connections
- ✅ **Safe Operations** - Rollback on errors

## 🧪 Test Everything Works

```bash
npm test
```

Should show: **77 tests passing**

## 🆘 Troubleshooting

### **"unauthorized" Error**
- Check your API key is correct
- Verify n8n is running and accessible
- Ensure API URL includes `/api/v1` suffix

### **"ECONNREFUSED" Error**  
- Check n8n is running on the specified URL
- Verify port number (default: 5678)
- Check firewall/network settings

### **Build Errors**
```bash
npm run build
```
Should complete without TypeScript errors.

---

**Need Help?** Check `API_UPDATES_OVERVIEW.md` for detailed documentation. 