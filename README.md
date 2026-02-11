# Claude Board

A Kanban board that lives inside Claude Desktop. Manage your tasks visually with drag-and-drop columns, labels, priorities, due dates, checklists, and image attachments.

Claude Board starts automatically when you open Claude Desktop and closes when you quit — no need to run anything manually after the initial setup.

## Features

- Drag-and-drop task management with customisable columns
- Labels, priorities, due dates, and checklists
- Image attachments (paste, drag-and-drop, or file picker)
- Real-time sync across multiple windows
- Light and dark themes
- Ask Claude to manage your tasks using natural language

## Getting Started (Step by Step)

### 1. Install Node.js

If you don't already have Node.js installed:

- Go to [https://nodejs.org](https://nodejs.org)
- Download the **LTS** version (the one on the left)
- Run the installer and follow the prompts

To check it's installed, open **Terminal** (Mac) or **Command Prompt** (Windows) and type:

```
node --version
```

You should see a version number like `v20.x.x`.

### 2. Download Claude Board

Open Terminal (or Command Prompt) and run these commands one at a time:

```bash
git clone https://github.com/karlfoster/claude-board.git
cd claude-board
npm install
npm run build
```

This downloads the project and installs everything it needs.

### 3. Find the project path

You need the full path to the project folder. In your terminal, run:

- **Mac/Linux:** `pwd`
- **Windows:** `cd`

It will print something like `/Users/yourname/claude-board` or `C:\Users\yourname\claude-board`. Copy this — you'll need it in the next step.

### 4. Connect to Claude Desktop

1. Open **Claude Desktop**
2. Go to **Settings** (gear icon) > **Developer** > **Edit Config**
3. This opens a file called `claude_desktop_config.json`. Paste the following into it:

```json
{
  "mcpServers": {
    "Claude Board": {
      "command": "node",
      "args": ["/YOUR/PATH/TO/claude-board/dist/mcp/index.js"],
      "env": {
        "KANBAN_API_URL": "http://localhost:3333"
      }
    }
  }
}
```

4. Replace `/YOUR/PATH/TO/claude-board` with the path you copied in step 3
5. Save the file and **restart Claude Desktop**

That's it. Claude Board will now start automatically whenever you open Claude Desktop, and shut down when you close it.

### 5. Using Claude Board

Once Claude Desktop restarts, you can:

- **Ask Claude** to manage tasks: "Add a task called 'Buy groceries' to my To Do column"
- **Open the board** in your browser at [http://localhost:3333](http://localhost:3333) to drag and drop tasks yourself

## Tech Stack

- Next.js 14, React 18, TypeScript
- Tailwind CSS
- @hello-pangea/dnd (drag and drop)
- WebSocket (real-time sync)
- MCP SDK

## License

MIT
