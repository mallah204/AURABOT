import { ICommand, IRunParams, IEventRunParams } from '@types';
import { client } from '@main/client';
import { PREFIX } from '@main/config';

const ITEMS_PER_PAGE = 10;

const command: ICommand = {
    config: {
        name: "help",
        version: "1.0.0",
        author: "Donix",
        description: "Xem danh sách lệnh (có phân trang)",
        category: "System",
        aliases: ['menu', 'commands']
    },

    run: async (params: IRunParams | IEventRunParams) => {
        const { api, event, args, send } = params as IRunParams;
        const commandName = args[0]?.toLowerCase();
        const pageArg = parseInt(args[0] || args[1] || '1');

        // Show command details
        if (commandName && !isNaN(pageArg) && pageArg === parseInt(args[0])) {
            // It's a page number, not a command name
        } else if (commandName && isNaN(parseInt(commandName))) {
            const cmd = client.commands.get(commandName) ||
                      Array.from(client.commands.values()).find(c =>
                        c.config.aliases?.includes(commandName)
                      );
            if (cmd) {
                const info = `
📋 Thông tin lệnh: ${PREFIX}${cmd.config.name}

📝 Mô tả: ${cmd.config.description || 'Không có mô tả'}
👤 Tác giả: ${cmd.config.author || 'Unknown'}
📦 Phiên bản: ${cmd.config.version || '1.0.0'}
📁 Danh mục: ${cmd.config.category || 'General'}
📌 Cú pháp: ${cmd.config.usages || `${PREFIX}${cmd.config.name}`}
${cmd.config.aliases ? `🔄 Aliases: ${cmd.config.aliases.join(', ')}` : ''}
                `.trim();
                await send(info);
            } else {
                await send(`❓ Không tìm thấy lệnh "${commandName}"`);
            }
            return;
        }

        // Show paginated command list
        const categories = new Map<string, Array<{ name: string; description: string }>>();

        for (const [name, cmd] of client.commands.entries()) {
            const category = cmd.config.category || 'General';
            if (!categories.has(category)) {
                categories.set(category, []);
            }
            categories.get(category)!.push({
                name,
                description: cmd.config.description || 'Không có mô tả'
            });
        }

        // Flatten all commands for pagination
        const allCommands: Array<{ category: string; name: string; description: string }> = [];
        for (const [category, commands] of categories.entries()) {
            for (const cmd of commands) {
                allCommands.push({ category, ...cmd });
            }
        }

        const totalPages = Math.ceil(allCommands.length / ITEMS_PER_PAGE);
        const page = Math.max(1, Math.min(pageArg || 1, totalPages));
        const start = (page - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        const pageCommands = allCommands.slice(start, end);

        let message = `📚 Danh sách lệnh (Prefix: ${PREFIX})\n`;
        message += `📄 Trang ${page}/${totalPages}\n\n`;

        // Group by category for current page
        const pageCategories = new Map<string, string[]>();
        for (const cmd of pageCommands) {
            if (!pageCategories.has(cmd.category)) {
                pageCategories.set(cmd.category, []);
            }
            pageCategories.get(cmd.category)!.push(`  • ${PREFIX}${cmd.name} - ${cmd.description}`);
        }

        for (const [category, commands] of pageCategories.entries()) {
            message += `📁 ${category}:\n`;
            message += commands.join('\n');
            message += '\n\n';
        }

        message += `💡 Dùng ${PREFIX}help <tên lệnh> để xem chi tiết\n`;
        message += `📄 Dùng ${PREFIX}help <số trang> để xem trang khác`;

        if (totalPages > 1) {
            message += `\n\n🔄 Trang: ${page}/${totalPages}`;
        }

        await send(message);
    }
};

export = command;
