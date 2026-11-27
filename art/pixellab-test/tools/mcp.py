#!/usr/bin/env python3
"""Mini client MCP (JSON-RPC over HTTP) pour PixelLab.
Lit le jeton dans ~/.claude.json sans jamais l'afficher.
Usage : mcp.py list | mcp.py call <outil> '<json args>'"""
import json, os, sys, urllib.request

CFG = os.path.expanduser('~/.claude.json')
srv = json.load(open(CFG))['projects']['/home/ndecrucq/Bureau/claude-workspace/hot-drop']['mcpServers']['pixellab']
URL = srv['url']
HDR = dict(srv.get('headers', {}))
STATE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.session')

def post(payload, sid=None):
    h = {'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream', **HDR}
    if sid: h['Mcp-Session-Id'] = sid
    req = urllib.request.Request(URL, data=json.dumps(payload).encode(), headers=h, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            body = r.read().decode()
            new_sid = r.headers.get('Mcp-Session-Id')
    except urllib.error.HTTPError as e:
        body = e.read().decode(); new_sid = None
        print('HTTP', e.code, body[:2000], file=sys.stderr); sys.exit(1)
    msgs = []
    if body.lstrip().startswith('{') or body.lstrip().startswith('['):
        msgs.append(json.loads(body))
    else:
        for line in body.splitlines():
            if line.startswith('data:'):
                d = line[5:].strip()
                if d: msgs.append(json.loads(d))
    return msgs, new_sid

def session():
    if os.path.exists(STATE):
        return open(STATE).read().strip() or None
    msgs, sid = post({'jsonrpc': '2.0', 'id': 1, 'method': 'initialize', 'params': {
        'protocolVersion': '2025-03-26', 'capabilities': {}, 'clientInfo': {'name': 'pixellab-test', 'version': '0.1'}}})
    if sid:
        post({'jsonrpc': '2.0', 'method': 'notifications/initialized'}, sid)
    open(STATE, 'w').write(sid or '')
    return sid

def rpc(method, params):
    sid = session()
    msgs, _ = post({'jsonrpc': '2.0', 'id': 2, 'method': method, 'params': params}, sid)
    for m in msgs:
        if m.get('id') == 2: return m
    return msgs

if __name__ == '__main__':
    if sys.argv[1] == 'list':
        r = rpc('tools/list', {})
        for t in r['result']['tools']:
            print('##', t['name']); print(t.get('description', '')[:1500]); print(json.dumps(t.get('inputSchema', {}))[:3000]); print()
    elif sys.argv[1] == 'call':
        r = rpc('tools/call', {'name': sys.argv[2], 'arguments': json.loads(sys.argv[3] if len(sys.argv) > 3 else '{}')})
        print(json.dumps(r, indent=1, ensure_ascii=False))
