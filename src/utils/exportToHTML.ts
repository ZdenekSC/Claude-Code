import { GameNodeType } from '../types';
import type { GameProject, StartNodeData, StoryNodeData, ChoiceNodeData, EndNodeData } from '../types';

export function exportToHTML(project: GameProject): string {
  const startNode = project.nodes.find(n => n.type === GameNodeType.START);
  if (!startNode) {
    throw new Error('No start node found in the project');
  }

  const startData = startNode.data as StartNodeData;

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(startData.title)}</title>
  <style>
    * {
      box-sizing: border-box;
    }
    body {
      font-family: 'Georgia', serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
    }
    .container {
      background: white;
      padding: 40px;
      border-radius: 10px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    }
    h1 {
      color: #333;
      border-bottom: 3px solid #667eea;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    h2 {
      color: #555;
      margin-top: 30px;
    }
    .section {
      margin: 30px 0;
      padding: 20px;
      background: #f9f9f9;
      border-left: 4px solid #667eea;
      border-radius: 5px;
    }
    .choice {
      display: block;
      margin: 15px 0;
      padding: 15px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      border-radius: 5px;
      transition: transform 0.2s, box-shadow 0.2s;
      font-weight: bold;
    }
    .choice:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
    }
    .ending {
      text-align: center;
      padding: 40px;
      background: #f0f0f0;
      border-radius: 10px;
      margin: 30px 0;
    }
    .ending.victory {
      background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%);
    }
    .ending.defeat {
      background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
    }
    .stats {
      background: #e8f4f8;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
    }
    .stats-item {
      display: inline-block;
      margin-right: 20px;
      font-weight: bold;
      color: #667eea;
    }
    .inventory {
      background: #fff3cd;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
      border: 2px solid #ffc107;
    }
    .item {
      display: inline-block;
      margin: 5px;
      padding: 8px 15px;
      background: white;
      border: 1px solid #ffc107;
      border-radius: 20px;
      font-size: 14px;
    }
    .content {
      line-height: 1.8;
      color: #333;
      font-size: 18px;
    }
    pre {
      white-space: pre-wrap;
      font-family: 'Georgia', serif;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${escapeHtml(startData.title)}</h1>
`;

  // Generate sections for each node
  const processedNodes = new Set<string>();
  const nodesToProcess = [startNode];

  while (nodesToProcess.length > 0) {
    const node = nodesToProcess.shift()!;
    if (processedNodes.has(node.id)) continue;
    processedNodes.add(node.id);

    html += `\n    <div id="${node.id}" class="section">\n`;

    switch (node.type) {
      case GameNodeType.START:
        const startNodeData = node.data as StartNodeData;
        html += `      <h2>📖 ${escapeHtml(startNodeData.title)}</h2>\n`;
        html += `      <div class="stats">\n`;
        html += `        <span class="stats-item">❤️ Health: ${startNodeData.initialStats.health}</span>\n`;
        html += `        <span class="stats-item">💰 Gold: ${startNodeData.initialStats.gold}</span>\n`;
        html += `      </div>\n`;
        html += `      <p><strong>Your adventure begins here...</strong></p>\n`;
        break;

      case GameNodeType.STORY:
        const storyData = node.data as StoryNodeData;
        html += `      <h2>📖 ${escapeHtml(storyData.label)}</h2>\n`;
        html += `      <div class="content">\n`;
        html += `        <pre>${escapeHtml(storyData.content)}</pre>\n`;
        html += `      </div>\n`;

        if (storyData.inventoryActions && storyData.inventoryActions.length > 0) {
          html += `      <div class="inventory">\n`;
          html += `        <strong>📦 Inventory Changes:</strong><br>\n`;
          storyData.inventoryActions.forEach(action => {
            const item = project.items.find(i => i.id === action.itemId);
            if (item) {
              const icon = action.action === 'add' ? '➕' : '➖';
              html += `        <span class="item">${icon} ${escapeHtml(item.name)}</span>\n`;
            }
          });
          html += `      </div>\n`;
        }

        if (storyData.statModifications && storyData.statModifications.length > 0) {
          html += `      <div class="stats">\n`;
          html += `        <strong>📊 Stat Changes:</strong><br>\n`;
          storyData.statModifications.forEach(mod => {
            let icon = '📈';
            let text = '';
            if (mod.operation === 'add') {
              icon = '➕';
              text = `${mod.statName} +${mod.value}`;
            } else if (mod.operation === 'subtract') {
              icon = '➖';
              text = `${mod.statName} -${mod.value}`;
            } else {
              icon = '📝';
              text = `${mod.statName} = ${mod.value}`;
            }
            html += `        <span class="stats-item">${icon} ${text}</span>\n`;
          });
          html += `      </div>\n`;
        }
        break;

      case GameNodeType.CHOICE:
        const choiceData = node.data as ChoiceNodeData;
        html += `      <h2>🔀 ${escapeHtml(choiceData.label)}</h2>\n`;
        if (choiceData.description) {
          html += `      <p class="content">${escapeHtml(choiceData.description)}</p>\n`;
        }
        html += `      <div style="margin-top: 20px;">\n`;
        choiceData.choices.forEach((choice, index) => {
          // Find the target node for this choice
          const edges = project.edges.filter(e => e.source === node.id);
          if (edges[index]) {
            html += `        <a href="#${edges[index].target}" class="choice">→ ${escapeHtml(choice.text)}</a>\n`;
          }
        });
        html += `      </div>\n`;
        break;

      case GameNodeType.END:
        const endData = node.data as EndNodeData;
        const endingClass = endData.endingType;
        const endingIcon = endData.endingType === 'victory' ? '🏆' : endData.endingType === 'defeat' ? '💀' : '🏁';
        html += `      <div class="ending ${endingClass}">\n`;
        html += `        <h2>${endingIcon} ${escapeHtml(endData.label)}</h2>\n`;
        html += `        <p class="content">${escapeHtml(endData.message)}</p>\n`;
        html += `      </div>\n`;
        break;

      case GameNodeType.BATTLE:
        html += `      <h2>⚔️ ${escapeHtml(node.data.label)}</h2>\n`;
        html += `      <p class="content"><strong>A battle ensues!</strong></p>\n`;
        html += `      <p class="content"><em>(In the interactive version, you would fight here)</em></p>\n`;
        break;

      case GameNodeType.CONDITION:
        html += `      <h2>❓ ${escapeHtml(node.data.label)}</h2>\n`;
        html += `      <p class="content"><em>The story branches based on your choices and inventory...</em></p>\n`;
        break;

      case GameNodeType.INVENTORY:
        html += `      <h2>🎒 ${escapeHtml(node.data.label)}</h2>\n`;
        html += `      <p class="content"><em>Your inventory is updated...</em></p>\n`;
        break;
    }

    html += `    </div>\n`;

    // Find connected nodes
    const outgoingEdges = project.edges.filter(e => e.source === node.id);
    outgoingEdges.forEach(edge => {
      const targetNode = project.nodes.find(n => n.id === edge.target);
      if (targetNode && !processedNodes.has(targetNode.id)) {
        nodesToProcess.push(targetNode);
      }
    });
  }

  html += `
  </div>
  <script>
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // Highlight the section briefly
          target.style.background = '#fffacd';
          setTimeout(() => {
            target.style.background = '#f9f9f9';
          }, 1000);
        }
      });
    });

    // Start at the beginning
    window.addEventListener('load', () => {
      const startNode = document.querySelector('[id^="start-"]');
      if (startNode) {
        startNode.scrollIntoView({ behavior: 'smooth' });
      }
    });
  </script>
</body>
</html>`;

  return html;
}

function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

export function downloadHTML(project: GameProject) {
  const html = exportToHTML(project);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.name.replace(/\s+/g, '-').toLowerCase()}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
