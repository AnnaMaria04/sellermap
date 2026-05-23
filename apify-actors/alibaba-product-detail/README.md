# SellerMap Alibaba Product Detail Actor

Custom actor scaffold for cases where store actors do not return rendered packaging fields.

Target fields:
- Single package size
- Single gross weight
- Package size / Gross weight
- 产品包装尺寸 / 毛重

This actor is intentionally separate from the Next.js app. Deploy it to Apify when the current
Alibaba actor misses packaging data, then set `ALIBABA_ACTOR_ID` or `APIFY_ALIBABA_ACTOR_ID`
to the deployed actor id.
