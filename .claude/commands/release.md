Perform a full patch release of the RadarGun project. Follow these steps exactly and in order:

## Steps

### 1. Read the current version
Read `package.json` and extract the current `version` field (semver format: `major.minor.patch`).

### 2. Increment the patch version
Add 1 to the patch segment. For example `1.0.2` → `1.0.3`. Store this as `NEW_VERSION`.

### 3. Update package.json
Edit `package.json` and replace the `version` field value with `NEW_VERSION`. Do not change any other content in the file.

### 4. Commit the version bump
Stage `package.json` and create a commit:
```
git add package.json
git commit -m "Release v{NEW_VERSION}"
```

### 5. Push to GitHub
```
git push
```

### 6. Create the GitHub release
Use the `gh` CLI to create a release tagged `v{NEW_VERSION}`, mark it as latest, and auto-generate release notes from commits since the last tag:
```
gh release create v{NEW_VERSION} \
  --title "v{NEW_VERSION}" \
  --generate-notes \
  --latest
```

### 7. Report completion
Tell the user the new version number and show the GitHub release URL returned by `gh release create`.

## Rules
- Always increment only the **patch** segment unless the user specifies `minor` or `major` as an argument to the command.
- If `$ARGUMENTS` contains `minor`, increment the minor version and reset patch to 0.
- If `$ARGUMENTS` contains `major`, increment the major version and reset minor and patch to 0.
- Do not push or release if the `git commit` step fails.
- Do not proceed past step 5 if `git push` fails — report the error instead.
