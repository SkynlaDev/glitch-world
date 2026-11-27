#!/usr/bin/env python3
"""Génère preview.html (autonome, manifeste des sheets intégré pour marcher en file://)."""
import json, os
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
man = json.load(open(os.path.join(HERE, 'sheets', 'steven_sheets.json')))
html = open(os.path.join(HERE, 'tools', 'preview.template.html')).read().replace('/*MANIFEST*/null', json.dumps(man))
open(os.path.join(HERE, 'preview.html'), 'w').write(html)
print('preview.html écrit')
