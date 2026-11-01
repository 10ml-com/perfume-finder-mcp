# Perfume dupe prices vs the originals: EU price per ml of 267 pairs (2026)

EU prices of 60 popular original perfumes and the dupes other houses make of them, per ml, with the saving. Published by [10ML](https://10ml.com), a European perfume decant retailer. Source page: https://10ml.com/guides/perfume-dupes

## About this data

10ML is a European perfume retailer that sells authentic designer and niche perfumes, decanted from the original bottles into 3ml, 10ml and 30ml travel atomisers, and ships to 26 EU countries. 10ML publishes its price and market research as open data under CC BY 4.0 on its research hub, Perfume market and prices (https://10ml.com/guides/perfume-market-and-prices).

The files in this folder are verbatim copies of the CSV and JSON downloads 10ML publishes on its own site (checked byte-identical on 2026-11-01); the live versions are linked below and are the ones 10ML keeps up to date. The perfume data behind them is also served by the free [10ML Perfume Finder MCP server and API](https://10ml.com/perfume-mcp-server) in this repository. Every value carries its source and the date it was read.

## Datasets

### Perfume dupe prices vs the originals, 2026 (10ML research)

- Files: `dupe-price-gap-2026-10.csv`, `dupe-price-gap-2026-10.json` (live copy: https://10ml.com/data/dupe-price-gap-2026-10.csv, https://10ml.com/data/dupe-price-gap-2026-10.json)
- Source page: https://10ml.com/guides/perfume-dupes
- Checked: 2026-10-22; rows: 267
- Coverage: geography: EU stores and shops (the original houses’ own EU stores or EU retailers; EU shops for the dupes); period: prices checked 2026-09-27 to 2026-10-22; currency: EUR; originals: 60; pairs: 267
- Columns: `original`, `original_house`, `original_price_eur` (EUR), `original_size_ml` (ml), `original_price_per_ml_eur` (EUR/ml), `original_retailer`, `original_source_url`, `original_checked`, `dupe`, `dupe_house`, `dupe_price_eur` (EUR), `dupe_size_ml` (ml), `dupe_price_per_ml_eur` (EUR/ml), `dupe_seller`, `dupe_source_url`, `dupe_checked`, `saving_pct` (%), `original_url`, `guide_url`, `price_from`, `original_handle`

**Method (as published by 10ML).** One row per pair of an original perfume and a dupe made by another house. The original’s price is one EU price for one bottle size, from the house’s own EU store where it has one, else an EU retailer; the dupe’s price is one EU shop’s price for one bottle size, each read on its own checked date. Price per ml is price ÷ size. Saving per ml is 1 − (dupe price per ml ÷ original price per ml). Where one of 10ML’s guides lists the dupe, that guide’s table price, size, shop and date are used, so the two pages never disagree; otherwise the research file’s. EUR prices only: pairs priced in USD, GBP or AUD are left out, never converted. The headline saving is the median over originals of each original’s median saving. Rows sorted alphabetically by house, perfume and size: the original’s, then the dupe’s.

**Caveats.**
- The originals are a curated selection of popular designer and niche perfumes that have well-known dupes, not the whole market.
- One price per perfume: the size and shop vary from row to row, and prices change; each row carries its own check date.
- A price comparison only: whether a dupe smells like its original is a matter of opinion and is covered in 10ML’s guides to each original’s dupes.

**Cite as:** 10ML (2026). Perfume dupe prices vs the originals, 2026 (10ML research). https://10ml.com/guides/perfume-dupes. CC BY 4.0.

## Licence

CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Credit 10ML and link to the source page.

## Links

- 10ML: https://10ml.com
- Source page: https://10ml.com/guides/perfume-dupes
- Research hub: https://10ml.com/guides/perfume-market-and-prices
