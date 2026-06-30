---
name: skill-packaging
description: Package and distribute skills. Use when the user wants to finalize a skill, create a .skill file, install a skill, share a skill with others, or update an existing skill. Also trigger when users mention skill distribution, installing skills, sharing skills, or exporting skills as .skill files.
---

# Skill Packaging

Package and distribute skills as `.skill` files. Use this when a skill is finalized and ready to share or install.

## Basic Packaging

Run the packaging script:
```bash
python -m scripts.package_skill <path/to/skill-folder>
```

This creates a `.skill` file. Direct the user to the resulting file path so they can install it.

## Environment-Specific Packaging

### Claude Code

Packaging works as described above. The `.skill` file can be installed by placing it in the appropriate skills directory.

### Claude.ai

The `package_skill.py` script works anywhere with Python and a filesystem. On Claude.ai, you can run it and the user can download the resulting `.skill` file.

### Cowork

Packaging works — `package_skill.py` just needs Python and a filesystem. The resulting `.skill` file can be shared or installed manually.

## Updating an Existing Skill

When updating an existing skill (not creating a new one):

1. **Preserve the original name** — use the skill's directory name and `name` frontmatter field unchanged. E.g., if the installed skill is `research-helper`, output `research-helper.skill` (not `research-helper-v2`)

2. **Copy to a writeable location before editing** — the installed skill path may be read-only. Copy to `/tmp/skill-name/`, edit there, and package from the copy

3. **If packaging manually, stage in `/tmp/` first**, then copy to the output directory — direct writes may fail due to permissions

## Installing Skills

Skills are typically installed by placing the `.skill` file or unpacked skill directory in one of these locations:
- `.claude/skills/` (project-level, in the repo)
- `~/.claude/skills/` (user-level)
- Other skill directories depending on the Claude installation

After installation, Claude will discover the skill on the next session start.

## Post-Packaging Checklist

- [ ] Skill name is preserved (for updates)
- [ ] SKILL.md frontmatter has `name` and `description`
- [ ] SKILL.md body is under 500 lines (split into references if longer)
- [ ] Any bundled resources are in `scripts/`, `references/`, or `assets/`
- [ ] Test the skill works with a quick manual run before distributing
