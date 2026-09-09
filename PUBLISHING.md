# Publishing Drop In

## The short version

```bash
npm run vsix        # produces drop-in-<version>.vsix
```

Then go to <https://marketplace.visualstudio.com/manage>, sign in with your Microsoft account,
and **upload the `.vsix` through the web UI**. No token, no CLI, no CI needed.

If the publisher `tonydmorris` does not exist yet, create it first at
<https://marketplace.visualstudio.com/manage/createpublisher>. The publisher ID must match the
`publisher` field in `package.json`.

## Publishing from the command line (optional)

Only worth setting up if you want tag-triggered releases. It needs an Azure DevOps Personal
Access Token, which is **not** created in the Marketplace UI:

1. Go to <https://dev.azure.com> and sign in with **the same Microsoft account**. Create an
   organization if you are prompted to — its name does not matter.
2. Top-right avatar → **User settings** → **Personal access tokens** → **New Token**.
3. **Organization: “All accessible organizations”.** This one is mandatory — leaving it on a
   single organization is the usual cause of a `401 Unauthorized` from `vsce`.
4. **Scopes: “Custom defined”** → **“Show all scopes”** → scroll to **Marketplace** → tick
   **Manage**.
5. Create, and copy the token immediately — it is shown once.

Then either publish by hand:

```bash
npx @vscode/vsce publish -p <token>
```

or hand it to CI once and forget it:

```bash
gh secret set VSCE_PAT        # paste the token when prompted
git tag v0.1.0 && git push --tags
```

`.github/workflows/release.yml` builds, attaches the `.vsix` to a GitHub Release, and publishes to
the Marketplace only when `VSCE_PAT` is present — so tagging is harmless before you add it.

## Open VSX (optional)

Cursor, Windsurf, VSCodium and Gitpod pull from [Open VSX](https://open-vsx.org) rather than the
Microsoft Marketplace. To publish there too, create a token at <https://open-vsx.org/user-settings/tokens>
and `gh secret set OVSX_PAT`. The release workflow skips this step when the secret is absent.

## Release checklist

1. Update `CHANGELOG.md` and bump `version` in `package.json`.
2. `npm test && npm run lint`
3. `npm run vsix`, install the `.vsix` locally, and try both flows in a clean window.
4. Upload, or tag and push.
