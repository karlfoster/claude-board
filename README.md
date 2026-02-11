# Claude Board

A Kanban board with MCP (Model Context Protocol) integration, built for use with Claude.

## Features

- Drag-and-drop task management
- Columns, labels, priorities, due dates, and checklists
- Image attachments (paste, drag-and-drop, or file picker)
- Real-time sync via WebSocket
- Light and dark themes
- MCP server for Claude Desktop integration

## Prerequisites

- Node.js 18+
- [Claude Desktop](https://claude.ai/download) (for MCP integration)

## Setup

```bash
git clone https://github.com/karlfoster/claude-board.git
cd claude-board
npm install
npm run build
```

## Running

```bash
npm start
```

The board will be available at [http://localhost:3333](http://localhost:3333).

## Claude Desktop Integration

Add the following to your `claude_desktop_config.json` (Claude > Settings > Developer > Edit Config):

```json
{
  "mcpServers": {
    "Claude Board": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/claude-board/dist/mcp/index.js"],
      "env": {
        "KANBAN_API_URL": "http://localhost:3333"
      }
    }
  }
}
```

Replace `/ABSOLUTE/PATH/TO/...` with the actual path to the project.

## Tech Stack

- Next.js 14, React 18, TypeScript
- Tailwind CSS
- @hello-pangea/dnd (drag and drop)
- WebSocket (real-time sync)
- MCP SDK

## License

MIT
