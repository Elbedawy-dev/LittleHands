#!/usr/bin/env node
/**
 * check-no-object-children.mjs
 *
 * Verifies that `pickLocale(` is NEVER rendered directly as an object inside JSX braces.
 * React 19 throws:
 * "Objects are not valid as a React child (found: object with keys {text, isFallback, lang, dir, toString})"
 *
 * Safe alternatives:
 * - <LocalizedText value={...} />
 * - pickLocale(...).text
 * - pickLocaleText(...)
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const SRC_DIR = path.resolve(__dirname, '../src')

let hasErrors = false
let filesChecked = 0
let occurrencesChecked = 0

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

function findMatchingParen(str, openIndex) {
  let depth = 1
  for (let i = openIndex + 1; i < str.length; i++) {
    if (str[i] === '(') depth++
    else if (str[i] === ')') {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

const files = walk(SRC_DIR)

for (const filePath of files) {
  // Ignore utils/index.js (definition) and LocalizedText.jsx (the component implementation)
  const normPath = filePath.replace(/\\/g, '/')
  if (normPath.endsWith('/utils/index.js') || normPath.endsWith('/components/ui/LocalizedText.jsx')) {
    continue
  }

  const content = fs.readFileSync(filePath, 'utf8')
  if (!content.includes('pickLocale(')) {
    continue
  }

  filesChecked++
  let searchIndex = 0

  while (true) {
    const callIndex = content.indexOf('pickLocale(', searchIndex)
    if (callIndex === -1) break
    searchIndex = callIndex + 11
    occurrencesChecked++

    const openParenIndex = callIndex + 10
    const closeParenIndex = findMatchingParen(content, openParenIndex)
    if (closeParenIndex === -1) continue

    // Check what immediately follows the closing parenthesis
    const afterCall = content.slice(closeParenIndex + 1).trimStart()
    const hasTextProperty = afterCall.startsWith('.text')

    // Find preceding characters (ignoring whitespace)
    let beforeIdx = callIndex - 1
    while (beforeIdx >= 0 && /\s/.test(content[beforeIdx])) {
      beforeIdx--
    }

    const prevChar = beforeIdx >= 0 ? content[beforeIdx] : ''

    // If pickLocale is used inside JSX expression braces: { pickLocale(...)
    // prevChar would be '{' or inside a JSX child context
    const isInsideBraces = prevChar === '{'

    // Also check if line looks like JSX child
    const lineStart = content.lastIndexOf('\n', callIndex) + 1
    const lineEnd = content.indexOf('\n', callIndex)
    const line = content.slice(lineStart, lineEnd === -1 ? content.length : lineEnd)
    const lineNum = content.slice(0, callIndex).split('\n').length

    // If it's inside JSX braces without .text
    if (isInsideBraces && !hasTextProperty) {
      console.error(
        `\x1b[31m[ERROR]\x1b[0m Direct pickLocale() object rendered in JSX at ${path.relative(process.cwd(), filePath)}:${lineNum}`
      )
      console.error(`  Line ${lineNum}: ${line.trim()}`)
      console.error(
        `  Fix: Use <LocalizedText value={...} /> or pickLocale(...).text or pickLocaleText(...)\n`
      )
      hasErrors = true
    }
  }
}

if (hasErrors) {
  console.error('\x1b[31mFAIL: Direct pickLocale object child detected in JSX!\x1b[0m')
  process.exit(1)
} else {
  console.log(
    `\x1b[32mPASS: check:children verified ${filesChecked} files (${occurrencesChecked} pickLocale calls). 0 object-as-child violations.\x1b[0m`
  )
  process.exit(0)
}
