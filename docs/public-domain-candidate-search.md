# Public-Domain Candidate Search

Use this when you want the next batch of songs to come from the local XML corpus and you want to
start with stronger-demand songs first.

## Traffic Signal

Exact Google keyword volume is not available from a simple public free API.
For first-pass ranking, use public pageview data as a demand proxy.

Recommended proxy:

- Wikimedia pageviews per article

## Workflow

1. Rank the local corpus titles by traffic proxy.
2. Filter out songs that are already public on the site.
3. Manually screen rights / publication status for the remaining top rows.
4. Batch the best 3 to 6 songs for preparation.
5. Stage them first, then release them gradually.

## Command

```bash
npm run rank:public-domain-candidates -- --source-dir=private/openewld/dataset --days=90 --top=30
```

To save a JSON report:

```bash
npm run rank:public-domain-candidates -- \
  --source-dir=private/openewld/dataset \
  --days=90 \
  --top=30 \
  --out=reference/song-publish-candidates/public-domain-traffic-ranking.json
```
