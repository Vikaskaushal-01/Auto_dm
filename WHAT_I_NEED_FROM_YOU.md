# What I Need From You to Go Live

This is the checklist of things you need to obtain/set up and hand over so real Instagram, Facebook, and WhatsApp automation can be built and tested against real accounts. See `GUIDE.md` for the full technical implementation details behind each item.

---

## Shared (needed once, before any platform works)

1. **A public HTTPS domain** where this app will run. Meta will not send webhooks or complete OAuth redirects to `localhost`. Either:
   - Deploy the app somewhere (Vercel, a VPS, etc.), **or**
   - Give me an ngrok / Cloudflare Tunnel URL for local testing
2. **Meta App ID + App Secret** — after you create the Meta Developer App (see `GUIDE.md` Section 1), paste me both values. I can't create the Meta app myself; that step happens in your browser at developers.facebook.com since it's tied to your identity for App Review.
3. **A Privacy Policy URL and Terms of Service URL** — even placeholder pages are fine to start. Meta requires both before granting most permissions.
4. **A verify token string** — any random string you pick (or I'll generate one) for `META_WEBHOOK_VERIFY_TOKEN`. Doesn't come from Meta — you just make it up.

---

## Instagram

5. An **Instagram account converted to Business or Creator** (in the IG app: Settings → Account type). Personal accounts can't be connected via API at all.
6. That IG account **linked to a Facebook Page** you admin (IG app → Settings → linked accounts, or via the Page's own settings on Facebook).
7. You (or whoever tests the connect flow) need to be logged into Facebook as an **admin of that Page** when clicking "Connect via Meta" — Meta's OAuth dialog will ask you to authorize as that Page.

---

## Facebook

8. The **Facebook Page** itself (the same one from #6 works, or a separate one) — I need it to exist; you connect it through the OAuth button in the running app, no credentials handed to me directly.
9. **Admin role on that Page** for whoever does the OAuth connect.

---

## WhatsApp

10. A **phone number not currently active on regular WhatsApp** — can't reuse a number with an existing personal/business WhatsApp account; it must be freed from WhatsApp first, or be a number that's never had WhatsApp.
11. Access to that number to **receive an SMS or voice call** for verification during setup.
12. A **Meta Business Account** (business.facebook.com) with **Business Verification** completed — requires real business documents (registration certificate, tax ID, or equivalent depending on your country) submitted through Meta's Business Settings → Security Center. This is the slowest step (can take days) and only you can submit it, since it's tied to your business identity.
13. Once WhatsApp Manager is set up, hand me these three directly (they go straight into `.env`, not through an OAuth flow like IG/FB):
    - **Phone Number ID**
    - **WhatsApp Business Account (WABA) ID**
    - **System User access token**

---

## What I can do without any of this yet

I can write and commit all the connector implementations, the OAuth routes, the webhook handler, and the token encryption module right now against the documented endpoints — none of that requires your credentials to *write*.

What's blocked without the items above:
- Actually **testing** any of it end-to-end (every real API call needs a real token)
- Anything requiring **App Review** approval (only you can submit that, since it's tied to your Meta identity)

---

## Suggested order

Hand me **#2 (App ID/Secret)** and a **domain (#1)** first — that unblocks building and testing the shared OAuth + webhook plumbing against your own test account, which is the fastest path to seeing one platform work with real data before dealing with WhatsApp's slower Business Verification step.
