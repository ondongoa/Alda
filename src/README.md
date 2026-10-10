# Sources du site ALDA

Les pages de `site/` sont générées à partir de `src/pages/` par `src/build.py`
(menu, pied de page et bloc contact communs). Les fichiers CSS, JS et images
restent directement dans `site/assets/`.

Après une modification dans `src/pages/` :

```
python3 src/build.py
```
