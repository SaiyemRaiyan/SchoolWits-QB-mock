# Putting the site on Netlify

You do this once. After that, every push to `main` updates the site by itself.

## The picture

```
   YOUR PC                  GITHUB                    NETLIFY
 ┌──────────┐  git push  ┌───────────┐  sees push  ┌───────────────┐
 │   code   │ ─────────► │   main    │ ──────────► │ npm run build │
 └──────────┘            └───────────┘             │       ↓       │
                                                   │     out/      │
                                                   └───────┬───────┘
                                                           ▼
                                                  https://….netlify.app

   YOUR PC                              SUPABASE
 ┌──────────┐   functions deploy   ┌────────────────────────────┐
 │  parser  │ ───────────────────► │ parse-paper (reads .tex)   │
 └──────────┘   (a separate step)  │ database · login · figures │
                                   └────────────────────────────┘
```

**Netlify holds the website. Supabase holds the parser and the data.** Pushing
to GitHub updates the website only. A parser change needs its own deploy.

Netlify builds on its own computers, so your PC does not run the build.

## Step 1: connect GitHub

```
 app.netlify.com
 ┌─────────────────────────────────────────┐
 │  Add new project                        │
 │    ▸ Import an existing project  ◄──────┼── click
 │  ┌────────┐ ┌────────┐ ┌───────────┐    │
 │  │ GitHub │ │ GitLab │ │ Bitbucket │    │
 │  └───▲────┘ └────────┘ └───────────┘    │
 └──────┼──────────────────────────────────┘
      click
```

Choose `SchoolWits-QB-mock`. If it is not listed, the owner of the repo has to
allow Netlify's GitHub app to see it.

## Step 2: check the settings

```
 ┌─────────────────────────────────────────┐
 │ Branch to deploy     main               │
 │ Base directory       (leave empty)      │
 │ Build command        npm run build      │  filled in from
 │ Publish directory    out                │  netlify.toml
 │ Environment vars     NONE  ◄────────────┼── add nothing
 │                                         │
 │              [ Deploy ]                 │
 └─────────────────────────────────────────┘
```

No environment variables. The public Supabase key is already in the code, and
the secret key must never be put on Netlify.

## Step 3: wait for the build

```
 Building ──► Deploying ──► Published  ✔   https://your-name.netlify.app
     │
     └──► Failed ✘   open the deploy log; the reason is in its last lines
```

To change the name: **Project configuration → Change project name**.

## Step 4: allow the login (do not skip)

Without this, Google sign-in sends people back to the wrong address.

```
 supabase.com ▸ your project ▸ Authentication ▸ URL Configuration
 ┌─────────────────────────────────────────┐
 │ Site URL                                │
 │   https://your-name.netlify.app         │
 │ Redirect URLs                           │
 │   https://your-name.netlify.app/**      │ ◄── add
 │   http://localhost:3000/**              │ ◄── keep
 └─────────────────────────────────────────┘
```

Change **Site URL** only when this is the main address of the site.

## Step 5: check it

- [ ] The home page opens
- [ ] `/browse` shows questions and the maths is drawn
- [ ] Google sign-in comes back to the Netlify address
- [ ] An admin can open `/upload` and preview a paper

## After that

| You changed | Do this |
|---|---|
| The website | `git push` to `main`. Netlify updates by itself |
| The parser (`backend/src/`) | `cd backend`, then `npx supabase functions deploy parse-paper --project-ref zzztbpbvxfpyzuxxlkdh` |
| Papers or questions | Nothing. They are in the database and show at once |

## If something goes wrong

| What you see | Why | Fix |
|---|---|---|
| Build failed | An error in the code | Read the end of the deploy log |
| "Page not found" on the whole site | Wrong publish directory | Set it to `out` |
| Login goes to another address | Step 4 is missing | Add the redirect URL |
| The old site still shows | The build is still running, or the browser kept a copy | Check **Deploys**, then refresh with Ctrl+Shift+R |
| A bad version went out | | **Deploys**, open an older one, **Publish deploy** |

Netlify sometimes renames its buttons, so the wording may differ a little.
