# Plugin / Skill guide — kon-ta kokhon use korba

Kaj shuru korar age ekhane dekho kon skill/plugin fit kore, tarpor use koro. Eigulo help/review-er jonno; owner-er "add koro" bola chhara code file-e likhba na (dekho `CLAUDE.md` §1).

## Backend

| Kaj | Use |
|---|---|
| Lean, simple design / over-engineering atkano | `ponytail` |
| Code review (correctness) | `code-review` |
| Security review (auth, tenant isolation, webhook, injection) | `security-review` |
| Prisma/Postgres schema ar migration question | Supabase-style SQL knowledge; PlanetScale `postgres` skill (Postgres best practice) |
| Claude/Anthropic API lagle (future AI feature) | `claude-api` |
| WhatsApp / SMS API lagle | Twilio docs MCP (`twilio-developer-kit:*`), WhatsApp Business MCP |
| Deploy / hosting | `railway:use-railway`, Vercel skills (`vercel:*`) |
| Cloud docs lookup | AWS/Cloudflare/Railway/Vercel docs MCP (guess na kore docs dekho) |

## Frontend

Order: direction → build → polish → verify.

1. **Direction:** `impeccable`, `frontend-design:frontend-design`, `ui-ux-pro-max:ui-ux-pro-max` (palette, font, UX rule), `design:design-critique`.
2. **Build:** `vercel:nextjs`, `vercel:react-best-practices`, `vercel:shadcn`, `composition-patterns`.
3. **Polish:** `make-interfaces-feel-better`, `transitions-dev` (modal, dropdown, toast, tabs), `transitions-polish`. JS animation lagle GSAP skills (`gsap-core`, `gsap-react`).
4. **Accessibility:** `accessibility-scan` / `accessibility-fix` / `accessibility-diff`, `design:accessibility-review`.
5. **Visual verify:** built-in browser (screenshot, responsive, dark mode), `playwright` MCP.

## Planning / docs / misc

| Kaj | Use |
|---|---|
| Architecture/flow diagram | Lucid MCP, `graphify` |
| Codebase-er question (code thakle) | `graphify` age, jodi `graphify-out/` thake |
| Simplify / cleanup review | `simplify` |
| Docs file (docx/pdf/xlsx) | `docx`, `pdf`, `xlsx` skills |
| Issue tracking | Linear MCP |

## Rule

- Kaj-er shuru-te ek line-e bolo kon skill use korcho.
- Better skill pele sheta prefer koro.
- Connector auth na thakle owner-ke bolo authorize korte, chup kore skip koro na.
