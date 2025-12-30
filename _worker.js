export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const params = url.searchParams;

    const server = params.get("server") || "tunnel.icmp9.com";
    const port = parseInt(params.get("port") || "443", 10);
    const uuid = params.get("uuid") || "";
    const servername = params.get("servername") || server;
    const tls = (params.get("tls") || "true") === "true";

    // 获取 API 数据
    let apiData = null;
    try {
      const apiResp = await fetch("https://api.icmp9.com/online.php", {
        cf: { cacheTtl: 60, cacheEverything: true }
      });
      apiData = await apiResp.json();
    } catch (e) {
      apiData = null;
    }

    const proxies = [];
    const proxyNames = ["DIRECT"];

    if (apiData && apiData.success && Array.isArray(apiData.countries)) {
      for (const country of apiData.countries) {
        const code = (country.code || "").toUpperCase();
        const name = `${country.emoji} ${code} | ${country.name}`;
        const path = `/${country.code}`;

        proxies.push({
          name,
          type: "vmess",
          server,
          port,
          uuid,
          alterId: 0,
          cipher: "auto",
          tls,
          servername,
          network: "ws",
          path
        });

        proxyNames.push(name);
      }
    }

    // 生成 YAML
    let yaml = "";
    yaml += "mixed-port: 7890\n";
    yaml += "allow-lan: true\n";
    yaml += "mode: rule\n";
    yaml += "log-level: info\n\n";

    // Proxies
    yaml += "proxies:\n";
    for (const p of proxies) {
      yaml += `  - name: '${p.name}'\n`;
      yaml += `    type: ${p.type}\n`;
      yaml += `    server: '${p.server}'\n`;
      yaml += `    port: ${p.port}\n`;
      yaml += `    uuid: ${p.uuid}\n`;
      yaml += `    alterId: 0\n`;
      yaml += `    cipher: auto\n`;
      yaml += `    tls: ${p.tls ? "true" : "false"}\n`;
      yaml += `    servername: '${p.servername}'\n`;
      yaml += `    network: ws\n`;
      yaml += `    ws-opts:\n`;
      yaml += `      path: '${p.path}'\n`;
      yaml += `      headers:\n`;
      yaml += `        Host: '${p.servername}'\n`;
    }

    // Proxy-Groups
    yaml += "\nproxy-groups:\n";
    yaml += "  - name: '🚀 节点选择'\n";
    yaml += "    type: select\n";
    yaml += "    proxies:\n";
    for (const name of proxyNames) {
      yaml += `      - '${name}'\n`;
    }

    // Rules
    yaml += "\nrules:\n";
    yaml += "  - MATCH, 🚀 节点选择\n";

    return new Response(yaml, {
      headers: {
        "Content-Type": "text/yaml; charset=utf-8"
      }
    });
  }
};
