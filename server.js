const http = require('http');
const fs = require('fs');
const path = require('path');
const PORT = 3000;

const mock = {
    "/download/download-User/": [
        { name: "Template", type: "directory", mtime: "2025-06-15T10:30:00Z" },
        { name: "Sandbox", type: "directory", mtime: "2025-06-20T14:20:00Z" },
        { name: "LogDB", type: "directory", mtime: "2025-06-18T09:00:00Z" },
        { name: "ISO", type: "directory", mtime: "2025-06-10T16:45:00Z" },
        { name: "imageClone", type: "directory", mtime: "2025-06-22T11:15:00Z" }
    ],
    "/download/download-User/Template/": [
        { name: "Archived", type: "directory", mtime: "2024-12-01T10:00:00Z" },
        { name: "CloudAvid_Proposal.docx", type: "file", size: 152400, mtime: "2025-06-15T10:30:00Z" },
        { name: "Network_Diagram.vsdx", type: "file", size: 892000, mtime: "2025-06-16T11:20:00Z" },
        { name: "Security_Checklist.pdf", type: "file", size: 312000, mtime: "2025-06-14T09:00:00Z" }
    ],
    "/download/download-User/Template/Archived/": [
        { name: "Legacy_Proposal_2022.docx", type: "file", size: 78900, mtime: "2022-03-22T09:00:00Z" }
    ],
    "/download/download-User/Sandbox/": [
        { name: "deploy_test.sh", type: "file", size: 2400, mtime: "2025-06-20T14:20:00Z" },
        { name: "api_mock.json", type: "file", size: 15600, mtime: "2025-06-19T13:00:00Z" },
        { name: "kernel_debug.log", type: "file", size: 890000, mtime: "2025-06-21T08:45:00Z" }
    ],
    "/download/download-User/LogDB/": [
        { name: "pg_backup_2025-06.sql.gz", type: "file", size: 245000000, mtime: "2025-06-01T02:00:00Z" },
        { name: "nginx_access.log", type: "file", size: 12500000, mtime: "2025-06-22T00:00:00Z" },
        { name: "redis_snapshot.rdb", type: "file", size: 8900000, mtime: "2025-06-20T03:00:00Z" }
    ],
    "/download/download-User/ISO/": [
        { name: "Ubuntu_24.04_Server.iso", type: "file", size: 2100000000, mtime: "2025-05-10T16:45:00Z" },
        { name: "Rocky_9.4_Minimal.iso", type: "file", size: 1800000000, mtime: "2025-04-15T10:00:00Z" },
        { name: "ESXi_8.0u3.iso", type: "file", size: 620000000, mtime: "2025-05-20T08:30:00Z" },
        { name: "Alpine_3.20_Virt.iso", type: "file", size: 45000000, mtime: "2025-06-05T12:00:00Z" }
    ],
    "/download/download-User/imageClone/": [
        { name: "WebServer_Nginx.qcow2", type: "file", size: 12000000000, mtime: "2025-06-22T11:15:00Z" },
        { name: "DB_PostgreSQL_15.vmdk", type: "file", size: 25000000000, mtime: "2025-06-20T15:30:00Z" },
        { name: "PfSense_2.7.qcow2", type: "file", size: 3200000000, mtime: "2025-06-18T10:00:00Z" }
    ],
    "/download/download-Avid/": [
        { name: "Security_Policy.pdf", type: "file", size: 2400000, mtime: "2025-06-14T10:00:00Z" },
        { name: "Ansible_Playbooks", type: "directory", mtime: "2025-06-19T16:00:00Z" }
    ],
    "/download/download-Avid/Ansible_Playbooks/": [
        { name: "setup_nginx.yml", type: "file", size: 3400, mtime: "2025-06-19T16:00:00Z" },
        { name: "harden_server.yml", type: "file", size: 5600, mtime: "2025-06-18T12:00:00Z" }
    ]
};

const mimes = {
    '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
    '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2'
};

http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);

    // JSON API
    if (url.startsWith('/__list/')) {
        const p = url.replace('/__list', '');
        const k = p.endsWith('/') ? p : p + '/';
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify(mock[k] || []));
        return;
    }

    // Directory → browse.html
    if (url.startsWith('/download/')) {
        const k = url.endsWith('/') ? url : url + '/';
        if (mock[k]) {
            fs.readFile(path.join(__dirname, 'browse.html'), (e, c) => {
                if (e) { res.writeHead(500); res.end('browse.html missing'); return; }
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(c);
            });
            return;
        }
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('[Mock Download] ' + url);
        return;
    }

    // Static
    const fp = path.join(__dirname, url === '/' ? 'index.html' : url);
    const ext = path.extname(fp).toLowerCase();

    fs.readFile(fp, (err, data) => {
        if (err) {
            if (['.png', '.jpg', '.ico'].includes(ext)) {
                res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
                res.end(`<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="%2314b8a6" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`);
                return;
            }
            res.writeHead(404); res.end('404 — ' + url); return;
        }
        res.writeHead(200, { 'Content-Type': mimes[ext] || 'application/octet-stream' });
        res.end(data);
    });
}).listen(PORT, () => {
    console.log(`
  ╔═══════════════════════════════════════╗
  ║   CloudAvid File Portal — Dev        ║
  ║   http://localhost:${PORT}              ║
  ╚═══════════════════════════════════════╝

  Home ──── http://localhost:${PORT}/
  ISO  ──── http://localhost:${PORT}/download/download-User/ISO/
  Tmpl ──── http://localhost:${PORT}/download/download-User/Template/

  Ctrl+C to stop
  `);
});