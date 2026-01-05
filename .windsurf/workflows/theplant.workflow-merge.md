---
description: Merge new workflows from a source directory into main workflows directory - add new workflows as separate commit, merge improvements to existing workflows as another commit, then create PR with summary.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Systematically merge workflows from a new source directory into the main workflows directory. Create two separate commits (new workflows + improved workflows) and generate a comprehensive PR description.

## Configuration

| Parameter    | Default               | Description                                       |
| ------------ | --------------------- | ------------------------------------------------- |
| `SOURCE_DIR` | (from $ARGUMENTS)     | Source directory containing new/updated workflows |
| `TARGET_DIR` | `.windsurf/workflows` | Main workflows directory                          |

## How to Execute This Workflow

**⚠️ MANDATORY: AI MUST run the workflow-runner command below and follow its output.**

```bash
deno run -A https://raw.githubusercontent.com/theplant/workflow-runner/HEAD/run.ts theplant.workflow-merge
```

Run this command, then follow the runner's instructions. The runner will tell you what to do next.

## Steps

### Step 1: Validate Input and Discover Workflows

**Why:** Ensure source directory exists and identify all workflows to process.

```bash
# Validate source directory exists
ls -la $SOURCE_DIR

# List all workflow files in source
find $SOURCE_DIR -name "*.md" -type f

# List all workflow files in target
find $TARGET_DIR -name "*.md" -type f -maxdepth 1
```

**Output:** Lists of source and target workflow files.

### Step 2: Categorize Workflows

**Why:** Separate new workflows from conflicting ones to handle them differently.

For each workflow in `$SOURCE_DIR`:

1. Extract filename (e.g., `theplant.feature-cleanup.md`)
2. Check if file exists in `$TARGET_DIR`
3. Categorize as:
   - **NEW**: File doesn't exist in target
   - **CONFLICT**: File exists in both locations

**Create categorization table:**

| Workflow File     | Category     | Action     |
| ----------------- | ------------ | ---------- |
| `theplant.xxx.md` | NEW/CONFLICT | Copy/Merge |

### Step 3: Analyze Conflicting Workflows

**Why:** Identify what new content exists in source that should be merged to target.

For each CONFLICT workflow:

1. **Read both versions:**

   ```bash
   # Read source version
   cat $SOURCE_DIR/theplant.xxx.md

   # Read target version
   cat $TARGET_DIR/theplant.xxx.md
   ```

2. **Compare and identify differences:**

   - New sections not in target
   - Enhanced explanations
   - Additional examples or tables
   - New best practices or anti-patterns
   - Improved error handling guidance

3. **Document findings:**

   ```markdown
   ## Workflow: theplant.xxx.md

   **Target version has:**

   - workflow-runner integration
   - Section A
   - Section B

   **Source version adds:**

   - Enhanced Section A with table
   - New Section C with examples
   - Additional anti-patterns

   **Merge strategy:**

   - Keep workflow-runner integration from target
   - Add enhanced content from source to target
   ```

### Step 4: Copy New Workflows

**Why:** New workflows should be added as-is in a separate commit.

```bash
# Copy each NEW workflow
for file in $NEW_WORKFLOWS; do
  cp "$SOURCE_DIR/$file" "$TARGET_DIR/"
done
```

**Verification:**

```bash
# Verify files copied
ls -la $TARGET_DIR/theplant.*.md
```

### Step 5: Merge Improvements to Existing Workflows

**Why:** Preserve target's structure (workflow-runner integration) while adding source's improvements.

For each CONFLICT workflow:

1. **Identify merge points** - Find where to insert new content without disrupting existing structure
2. **Extract new sections** from source version
3. **Use multi_edit tool** to add improvements to target:
   - Add new subsections
   - Enhance existing sections with tables/examples
   - Append new anti-patterns or best practices
   - Keep all existing workflow-runner references

**Merge principles:**

- Preserve target's "How to Execute This Workflow" section
- Keep target's step structure if it uses workflow-runner
- Add source's detailed guidance as enhancements
- Maintain consistent formatting

### Step 6: Create First Commit (New Workflows)

**Why:** Separate commit for new workflows makes history clearer.

```bash
# Stage new workflows only
git add $TARGET_DIR/theplant.new-workflow-1.md \
        $TARGET_DIR/theplant.new-workflow-2.md \
        $TARGET_DIR/theplant.new-workflow-3.md
```

**Commit message template:**

```
feat(workflows): add N new ThePlant workflows for [purpose summary]

Add N new comprehensive workflows to enhance development discipline:

1. theplant.workflow-name-1.md
   - [What it does]
   - [Key features]
   - [Usage scenarios]

2. theplant.workflow-name-2.md
   - [What it does]
   - [Key features]
   - [Usage scenarios]

[Continue for all new workflows]

These workflows complement existing ThePlant disciplines and provide practical tools for [overall benefit].
```

### Step 7: Create Second Commit (Merged Improvements)

**Why:** Document enhancements to existing workflows separately.

```bash
# Stage updated workflows
git add $TARGET_DIR/theplant.updated-1.md \
        $TARGET_DIR/theplant.updated-2.md
```

**Commit message template:**

```
refactor(workflows): merge improvements from [source] to N existing ThePlant workflows

Enhanced N existing workflows with best practices and detailed guidance:

1. theplant.workflow-1.md
   - Added [new section/feature]
   - Enhanced [existing section] with [improvement]
   - [Key improvement summary]

2. theplant.workflow-2.md
   - Added [new section/feature]
   - [Key improvement summary]

[Continue for all updated workflows]

All improvements maintain compatibility with existing workflow-runner integration while adding practical, battle-tested patterns from real project experience.
```

### Step 8: Generate PR Description

**Why:** Comprehensive PR description helps reviewers understand changes and their value.

**PR Description template:**

```markdown
# Pull Request Description

## 背景 / 目的

本 PR 将 `[SOURCE_DIR]` 中的 workflows 合并到主 workflows 目录，在保留现有 workflow-runner 集成的前提下，补充新的最佳实践和详细指导。

---

## 主要变更（按提交分组）

### Commit 1: [commit-hash] — 新增 N 个 ThePlant workflows

**新增文件**

- `theplant.workflow-1.md`
  - **做什么**：[功能描述]
  - **适用场景**：[使用场景]

[为每个新 workflow 重复]

---

### Commit 2: [commit-hash] — 合并 M 个已有 workflows 的增强内容

**更新文件**

- `theplant.workflow-1.md`
  - 新增 [section/feature]
  - 增强 [existing content]

[为每个更新的 workflow 重复]

---

## 使用方式 / 对开发者的影响

- **新增** N 个 workflow：可通过 `/theplant.xxx` 调用
- **增强** M 个 workflow：保留原有执行方式，增加更详细的规则与示例

---

## 验证

- **变更类型**：文档/workflow 规则更新（不影响运行时代码）
- **本 PR 不包含**：应用代码逻辑变更、依赖升级

---

## 关联提交

- `[commit-1]` feat(workflows): add N new ThePlant workflows...
- `[commit-2]` refactor(workflows): merge improvements...
```

**Output PR description to console for user to copy.**

### Step 9: Verification

**Why:** Ensure all workflows are properly formatted and accessible.

```bash
# Verify all workflows have proper frontmatter
for file in $TARGET_DIR/theplant.*.md; do
  head -n 3 "$file" | grep -q "^description:" || echo "Missing description: $file"
done

# Verify no duplicate workflows
find $TARGET_DIR -name "*.md" -type f | sort | uniq -d

# List all workflows for final review
ls -1 $TARGET_DIR/theplant.*.md
```

## Quality Gates

- All new workflows MUST have YAML frontmatter with `description` field
- All merged workflows MUST preserve workflow-runner integration if it existed
- Commit messages MUST follow conventional commit format
- PR description MUST include both commit summaries
- No workflow files should be duplicated

## AI Agent Requirements

- AI agents MUST read both source and target versions completely before merging
- AI agents MUST preserve target's workflow-runner integration
- AI agents MUST NOT delete existing content when merging improvements
- AI agents MUST create two separate commits (new + improved)
- AI agents MUST generate complete PR description with all workflows listed
- AI agents MUST verify no files are lost or duplicated after merge

## Context

$ARGUMENTS
