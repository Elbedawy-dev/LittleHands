#!/usr/bin/env node
/**
 * check-no-object-children.mjs
 *
 * 1. Verifies that `pickLocale(` is NEVER rendered directly as an object inside JSX braces.
 * 2. Scans ALL files in Frontend/src for direct JSX/alt/template renders of potentially
 *    bilingual API fields (.name, .description, .title, .label, .material, .itemName)
 *    without pickLocaleText() / pickLocale(...).text / <LocalizedText /> / String().
 *
 * Safe alternatives:
 * - <LocalizedText value={...} />
 * - pickLocale(...).text
 * - pickLocaleText(...)
 * - String(...)
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const SRC_DIR = path.resolve(__dirname, '../src')

// Small explicit allowlist of known non-bilingual scalar properties in UI/API DTOs
const SAFE_OBJECT_SUFFIXES = new Set([
  // UI navigation / option / tab / card / badge config objects
  'link.label',
  'tab.label',
  'step.label',
  'opt.label',
  'badge.label',
  'item.label',
  'stage.label',
  'stg.label',
  'mat.label',
  'cfg.label',
  'statusConfig.label',
  'card.title',
  'step.title',
  'item.title',
  'feat.title',
  'text.title',
  // Scalar user / customer / custom-request / file names
  'user.name',
  'c.name',
  'r.name',
  'customerToDelete.name',
  'requestToDelete.name',
  'createdSeller.name',
  'screenshotFile.name',
  // Delivery recipient & address DTOs (plain string name)
  'delivery.name',
  'deliveryData.name',
  'addr.name',
  // Category & Governorate DTOs (scalar string name + separate nameEn)
  'cat.name',
  'category.name',
  'g.name',
  'zone.name',
])

const CHECKED_FIELDS_RE =
  /\b([A-Za-z_$][\w$]*(?:\??\.[A-Za-z_$][\w$]*)*)\??\.(name|description|title|label|material|itemName)\b/g

let hasErrors = false
let filesChecked = 0
let pickLocaleChecked = 0
let bilingualChecks = 0

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...walk(fullPath))
    } else if (/\.(jsx|tsx|js|ts)$/.test(entry.name)) {
      files.push(fullPath)
    }
  }
  return files
}

function findMatchingDelimiter(str, openIndex, openCh = '(', closeCh = ')') {
  let depth = 0
  let inSingle = false
  let inDouble = false
  let inTemplate = false

  for (let i = openIndex; i < str.length; i++) {
    const ch = str[i]
    if ((inSingle || inDouble || inTemplate) && ch === '\\') {
      i++
      continue
    }
    if (inSingle) {
      if (ch === "'") inSingle = false
      continue
    }
    if (inDouble) {
      if (ch === '"') inDouble = false
      continue
    }
    if (inTemplate) {
      if (ch === '`') inTemplate = false
      continue
    }
    if (ch === "'") inSingle = true
    else if (ch === '"') inDouble = true
    else if (ch === '`') inTemplate = true
    else if (ch === openCh) depth++
    else if (ch === closeCh) {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

function stripCommentsPreserveLines(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:\\])\/\/.*$/gm, (m, prefix) => `${prefix}${' '.repeat(m.length - prefix.length)}`)
}

function isSafeWrapperBefore(prefix) {
  return /(?:pickLocaleText|pickLocale|getDisplayName|getGovernorateName|String|Number|Boolean|console\.\w+|typeof\s+|Array\.isArray)\s*\(?[^)}]*$/.test(
    prefix
  )
}

function isAllowlistedExpr(exprText) {
  const normalized = exprText.replace(/\?\./g, '.').replace(/\s+/g, '')
  if (SAFE_OBJECT_SUFFIXES.has(normalized)) return true
  const parts = normalized.split('.')
  if (parts.length >= 2) {
    const tail2 = parts.slice(-2).join('.')
    if (SAFE_OBJECT_SUFFIXES.has(tail2)) return true
  }
  return false
}

function isInsideTranslationCall(text, matchIdx) {
  const before = text.slice(Math.max(0, matchIdx - 80), matchIdx)
  return /\b(?:t|i18n\.t)\s*\(\s*['"`][^'"`]*$/.test(before)
}

function reportError(filePath, lineNum, line, title, hint) {
  console.error(`\x1b[31m[ERROR]\x1b[0m ${title} at ${path.relative(process.cwd(), filePath)}:${lineNum}`)
  console.error(`  Line ${lineNum}: ${line.trim()}`)
  console.error(`  Fix: ${hint}\n`)
  hasErrors = true
}

const files = walk(SRC_DIR)

for (const filePath of files) {
  const normPath = filePath.replace(/\\/g, '/')
  if (normPath.endsWith('/utils/index.js') || normPath.endsWith('/components/ui/LocalizedText.jsx')) {
    continue
  }

  const raw = fs.readFileSync(filePath, 'utf8')
  const content = stripCommentsPreserveLines(raw)
  filesChecked++

  // 1) Existing check: direct {pickLocale(...)} without .text
  let searchIndex = 0
  while (true) {
    const callIndex = content.indexOf('pickLocale(', searchIndex)
    if (callIndex === -1) break
    searchIndex = callIndex + 11
    pickLocaleChecked++

    const openParenIndex = callIndex + 10
    const closeParenIndex = findMatchingDelimiter(content, openParenIndex, '(', ')')
    if (closeParenIndex === -1) continue

    const afterCall = content.slice(closeParenIndex + 1).trimStart()
    const hasTextProperty = afterCall.startsWith('.text')

    let beforeIdx = callIndex - 1
    while (beforeIdx >= 0 && /\s/.test(content[beforeIdx])) beforeIdx--
    const prevChar = beforeIdx >= 0 ? content[beforeIdx] : ''

    if (prevChar === '{' && !hasTextProperty) {
      const lineNum = content.slice(0, callIndex).split('\n').length
      const lineStart = content.lastIndexOf('\n', callIndex) + 1
      const lineEnd = content.indexOf('\n', callIndex)
      const line = raw.slice(lineStart, lineEnd === -1 ? raw.length : lineEnd)
      reportError(
        filePath,
        lineNum,
        line,
        'Direct pickLocale() object rendered in JSX',
        'Use <LocalizedText value={...} /> or pickLocale(...).text or pickLocaleText(...)'
      )
    }
  }

  // 2) Expanded check (.jsx files): direct {x.name / x.description / x.title / x.label / x.material / x.itemName}
  //    or alt={...} or ${...} template strings rendered in UI
  if (!normPath.endsWith('.jsx')) continue

  const lines = raw.split(/\r?\n/)
  const cleanLines = content.split(/\r?\n/)

  for (let idx = 0; idx < cleanLines.length; idx++) {
    const line = cleanLines[idx]
    if (!/[{}]/.test(line)) continue

    CHECKED_FIELDS_RE.lastIndex = 0
    let m
    while ((m = CHECKED_FIELDS_RE.exec(line)) !== null) {
      bilingualChecks++
      const fullExpr = m[0]
      const before = line.slice(0, m.index)
      const after = line.slice(m.index + fullExpr.length)

      // Safe property accesses after the field (e.g., .ar, .en, .length, .text, methods)
      if (/^\??\.(ar|en|text|length|toLowerCase|toUpperCase|trim|split|slice|includes|replace|map|filter)\b/.test(after)) {
        continue
      }
      // Safe conditional check / comparison rather than direct render
      if (/^\s*(?:===|!==|==|!=|&&|\|\||[?])/.test(after) && !/^(?:\s*\|\|\s*['"`t(])/.test(after)) {
        continue
      }
      // Inside translation key string t('foo.title')
      if (isInsideTranslationCall(line, m.index)) {
        continue
      }
      // Guarded by typeof x === 'object' or safe helper on the same line
      if (/typeof\s+/.test(line) && /\?\s*/.test(line)) {
        continue
      }
      if (isSafeWrapperBefore(before)) {
        continue
      }
      // Safe non-bilingual property allowlist
      if (isAllowlistedExpr(fullExpr)) {
        continue
      }

      // Determine whether this expression sits in a rendered context:
      //  a) Template interpolation `${...}` inside JSX / message strings
      //  b) `alt={...}` attribute
      //  c) JSX child `{...}` (NOT preceded on same brace depth by `attr=`, EXCEPT fallback after `||` inside JSX child)
      const isTemplateInterp = /\$\{[^{}]*$/.test(before)
      const isAltAttr = /\balt\s*=\s*\{[^{}]*$/.test(before)
      const isPropAssign = /\b[A-Za-z_$][\w-]*\s*=\s*\{[^{}]*$/.test(before) && !isAltAttr
      const isJsxChild = !isPropAssign && !isTemplateInterp && /\{[^{}]*$/.test(before)

      // Also skip JSX prop objects/event handlers or expressions starting after `key=` / `value=` / `onClick=`
      if (isTemplateInterp || isAltAttr || isJsxChild) {
        // Ignore JSX attribute ternary when `isAltAttr` is false and prop wasn't parsed on same line (e.g. `title={` vs JSX child `{`)
        const prevLine = idx > 0 ? cleanLines[idx - 1].trim() : ''
        if (!isTemplateInterp && !isAltAttr && /\b(?:value|name|key|error|onClick|onChange|onSelect|items|options|data|columns|row|order|product|item|seller)\s*=\s*\{?\s*$/.test(prevLine)) {
          continue
        }
        // Skip plain string keys passed to icon/style maps or `<LocalizedText value={...} />` split across lines
        if (/value\s*=\s*\{/.test(before) || (/value\s*=\s*\{/.test(prevLine) && /LocalizedText/.test(prevLine))) {
          continue
        }

        reportError(
          filePath,
          idx + 1,
          lines[idx],
          `Potential unformatted bilingual/object child "${fullExpr}" rendered directly`,
          'Use <LocalizedText value={...} />, pickLocaleText(value, lang), pickLocale(value, lang).text, or String(...)'
        )
      }
    }
  }
}

if (hasErrors) {
  console.error('\x1b[31mFAIL: Unsafe object/bilingual field child detected in JSX!\x1b[0m')
  process.exit(1)
} else {
  console.log(
    `\x1b[32mPASS: check:children verified ${filesChecked} files (${pickLocaleChecked} pickLocale calls, ${bilingualChecks} field expressions). 0 violations.\x1b[0m`
  )
  process.exit(0)
}
