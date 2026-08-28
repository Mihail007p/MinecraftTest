#!/usr/bin/env python3
"""Вытаскивает three.js и код игры из index.html в devtools/ для запуска в Node."""
import re, os, sys
here = os.path.dirname(os.path.abspath(__file__))
src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(here, '..', 'index.html')
s = open(src, encoding='utf-8').read()
blocks = re.findall(r'<script[^>]*>(.*?)</script>', s, re.S)
open(os.path.join(here, 'three.js'), 'w', encoding='utf-8').write(blocks[1])
game = blocks[2].replace("updateMobsManager(dt);", "/* mobs off in harness */", 1)
game += """
;globalThis.__DBG = { chunks, rebuildChunkMesh, getBlock, setBlock, biomeAt, ICON_CANVAS, droppedItems,
 spawnBlockDrop, player, scene, THREE, CHUNK_SIZE, CHUNK_HEIGHT, WATER_LEVEL, updateDroppedItems, isOpaque,
 getBlockFaceTile, getTileUV, atlasTexture, PERF, terrainMaterial, camera, MC_TEX, generateChunkTerrain };
"""
open(os.path.join(here, 'game.js'), 'w', encoding='utf-8').write(game)
print('extracted', len(blocks), 'scripts')
