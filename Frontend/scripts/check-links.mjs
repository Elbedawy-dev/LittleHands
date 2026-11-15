/**
 * Validates internal frontend navigation links (to / navigate / href)
 * and backend notification links (listeners.js / jobs) against routes
 * declared in Frontend/src/app/router.jsx.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FRONTEND_DIR = path.resolve(__dirname, '..')
const FRONTEND_SRC = path.join(FRONTEND_DIR, 'src')
const ROUTER_FILE = path.join(FRONTEND_SRC, 'app', 'router.jsx')
const BACKEND_SCAN_DIRS = [
  path.resolve(FRONTEND_DIR, '../Backend/src/infra/notifications'),
  path.resolve(FRONTEND_DIR, '../Backend/src/jobs'),
]

const SKIP_STATIC_EXT = /\.(png|jpe?g|webp|svg|gif|ico|pdf|css|js|json|woff2?|ttf|mp4|mp3)$/i

function stripCommentsPreserveLines(code) {
  let out = ''
  let i = 0
  let inSingle = false
  let inDouble = false
  let inTemplate = false
  let tmplDepth = 0

  while (i < code.length) {
    const ch = code[i]
    const next = code[i + 1]

    if (inSingle) {
      out += ch
      if (ch === '\\' && i + 1 < code.length) {
        out += next
        i += 2
        continue
      }
      if (ch === "'") inSingle = false
      i++
      continue
    }

    if (inDouble) {
      out += ch
      if (ch === '\\' && i + 1 < code.length) {
        out += next
        i += 2
        continue
      }
      if (ch === '"') inDouble = false
      i++
      continue
    }

    if (inTemplate) {
      out += ch
      if (ch === '\\' && i + 1 < code.length) {
        out += next
        i += 2
        continue
      }
      if (ch === '$' && next === '{') {
        tmplDepth++
        out += next
        i += 2
        continue
      }
      if (ch === '}' && tmplDepth > 0) {
        tmplDepth--
        i++
        continue
      }
      if (ch === '`' && tmplDepth === 0) inTemplate = false
      i++
      continue
    }

    if (ch === '/' && next === '/') {
      while (i < code.length && code[i] !== '\n') {
        out += ' '
        i++
      }
      continue
    }

    if (ch === '/' && next === '*') {
      out += '  '
      i += 2
      while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) {
        out += code[i] === '\n' ? '\n' : ' '
        i++
      }
      if (i < code.length) {
        out += '  '
        i += 2
      }
      continue
    }

    out += ch
    if (ch === "'") inSingle = true
    else if (ch === '"') inDouble = true
    else if (ch === '`') inTemplate = true
    i++
  }

  return out
}

function findMatchingDelimiter(str, openIdx, openChar, closeChar) {
  let depth = 0
  let inSingle = false
  let inDouble = false
  let inTemplate = false

  for (let i = openIdx; i < str.length; i++) {
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
    else if (ch === openChar) depth++
    else if (ch === closeChar) {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

function splitTopLevelObjects(arrayBody) {
  const objs = []
  let i = 0
  while (i < arrayBody.length) {
    if (arrayBody[i] === '{') {
      const end = findMatchingDelimiter(arrayBody, i, '{', '}')
      if (end === -1) break
      objs.push(arrayBody.slice(i, end + 1))
      i = end + 1
    } else {
      i++
    }
  }
  return objs
}

function joinPaths(parentPath, childPath) {
  if (!childPath) return parentPath || '/'
  if (childPath === '*') return '*'
  if (childPath.startsWith('/')) return normalizeRoute(childPath)
  const base = parentPath === '/' ? '' : parentPath.replace(/\/+$/, '')
  return normalizeRoute(`${base}/${childPath}`)
}

function normalizeRoute(route) {
  if (!route) return '/'
  const noQuery = route.split('?')[0].split('#')[0].trim()
  if (!noQuery || noQuery === '/') return '/'
  return noQuery.replace(/\/+$/, '') || '/'
}

/**
 * Extract top-level properties (`path`, `index`, `children`) of a route object literal.
 */
function parseRouteObjects(arrayBody, parentPath = '') {
  const routes = []
  const objects = splitTopLevelObjects(arrayBody)

  for (const objStr of objects) {
    const inner = objStr.slice(1, -1)
    let pathVal = null
    let isIndex = false
    let childrenBody = null

    // Scan top-level keys inside this route object only
    let i = 0
    let braceDepth = 0
    let bracketDepth = 0
    let parenDepth = 0
    let inSingle = false
    let inDouble = false
    let inTemplate = false

    while (i < inner.length) {
      const ch = inner[i]
      if ((inSingle || inDouble || inTemplate) && ch === '\\') {
        i += 2
        continue
      }
      if (inSingle) {
        if (ch === "'") inSingle = false
        i++
        continue
      }
      if (inDouble) {
        if (ch === '"') inDouble = false
        i++
        continue
      }
      if (inTemplate) {
        if (ch === '`') inTemplate = false
        i++
        continue
      }
      if (ch === "'") {
        inSingle = true
        i++
        continue
      }
      if (ch === '"') {
        inDouble = true
        i++
        continue
      }
      if (ch === '`') {
        inTemplate = true
        i++
        continue
      }

      if (ch === '{') braceDepth++
      else if (ch === '}') braceDepth--
      else if (ch === '[') bracketDepth++
      else if (ch === ']') bracketDepth--
      else if (ch === '(') parenDepth++
      else if (ch === ')') parenDepth--

      if (braceDepth === 0 && bracketDepth === 0 && parenDepth === 0) {
        const rest = inner.slice(i)
        const pathMatch = rest.match(/^path\s*:\s*['"]([^'"]*)['"]/)
        if (pathMatch && (i === 0 || /[\s,{]/.test(inner[i - 1]))) {
          pathVal = pathMatch[1]
          i += pathMatch[0].length
          continue
        }
        const indexMatch = rest.match(/^index\s*:\s*true\b/)
        if (indexMatch && (i === 0 || /[\s,{]/.test(inner[i - 1]))) {
          isIndex = true
          i += indexMatch[0].length
          continue
        }
        const childrenMatch = rest.match(/^children\s*:\s*\[/)
        if (childrenMatch && (i === 0 || /[\s,{]/.test(inner[i - 1]))) {
          const openBracketIdx = i + childrenMatch[0].length - 1
          const closeBracketIdx = findMatchingDelimiter(inner, openBracketIdx, '[', ']')
          if (closeBracketIdx !== -1) {
            childrenBody = inner.slice(openBracketIdx + 1, closeBracketIdx)
            i = closeBracketIdx + 1
            continue
          }
        }
      }

      i++
    }

    if (pathVal === '*') continue

    const currentPath = pathVal !== null ? joinPaths(parentPath, pathVal) : parentPath || '/'
    if (isIndex || (!childrenBody && pathVal !== null)) {
      routes.push(normalizeRoute(currentPath))
    }
    if (childrenBody) {
      routes.push(...parseRouteObjects(childrenBody, currentPath))
    }
  }

  return routes
}

function loadRoutePatterns() {
  const raw = stripCommentsPreserveLines(fs.readFileSync(ROUTER_FILE, 'utf8'))
  const marker = raw.indexOf('createBrowserRouter(')
  if (marker === -1) {
    throw new Error('Could not find createBrowserRouter( in Frontend/src/app/router.jsx')
  }
  const openBracket = raw.indexOf('[', marker)
  const closeBracket = findMatchingDelimiter(raw, openBracket, '[', ']')
  const rootBody = raw.slice(openBracket + 1, closeBracket)
  const patterns = Array.from(new Set(parseRouteObjects(rootBody, '')))
  return patterns.filter((p) => p && !p.includes('*'))
}

function patternToRegex(pattern) {
  const normalized = normalizeRoute(pattern)
  if (normalized === '/') return /^\/$/
  const parts = normalized.split('/').filter(Boolean)
  const regexParts = parts.map((seg) => {
    if (seg.startsWith(':')) return '[^/]+'
    return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  })
  return new RegExp(`^/${regexParts.join('/')}$`)
}

function replaceTemplateExpressions(rawTemplate) {
  let out = ''
  let i = 0
  while (i < rawTemplate.length) {
    if (rawTemplate[i] === '$' && rawTemplate[i + 1] === '{') {
      let depth = 1
      i += 2
      while (i < rawTemplate.length && depth > 0) {
        if (rawTemplate[i] === '{') depth++
        else if (rawTemplate[i] === '}') depth--
        i++
      }
      out += 'sample-id'
    } else {
      out += rawTemplate[i]
      i++
    }
  }
  return out
}

function shouldCheckPath(candidate) {
  if (!candidate || typeof candidate !== 'string') return false
  const trimmed = candidate.trim()
  if (!trimmed) return false
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:') ||
    trimmed.startsWith('sms:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('#') ||
    trimmed.startsWith('?')
  ) {
    return false
  }
  if (!trimmed.startsWith('/')) return false
  if (trimmed.startsWith('/api/') || trimmed === '/api') return false
  const pathOnly = trimmed.split('?')[0].split('#')[0]
  if (SKIP_STATIC_EXT.test(pathOnly)) return false
  // Ignore bare interpolation placeholders like '/${something}' if already replaced at start
  if (pathOnly === '/sample-id') return false
  return true
}

function lineNumberAt(text, index) {
  let line = 1
  for (let i = 0; i < index; i++) {
    if (text[i] === '\n') line++
  }
  return line
}

function walkFiles(dir, exts) {
  const out = []
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue
      out.push(...walkFiles(full, exts))
    } else if (exts.test(entry.name)) {
      out.push(full)
    }
  }
  return out
}

function extractFrontendLinks(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8')
  const code = stripCommentsPreserveLines(raw)
  const findings = []

  // Match to=, navigate(, href=, href: with quoted/template or ternary/object strings
  const callOrPropRegex = /\b(?:to\s*=|navigate\s*\(|href\s*[:=])/g
  let match

  while ((match = callOrPropRegex.exec(code)) !== null) {
    let idx = match.index + match[0].length
    while (idx < code.length && /\s/.test(code[idx])) idx++

    // Extract balanced expression block for `{...}` or `(...)` or literal
    let expr = ''
    const startIdx = match.index
    const ch = code[idx]

    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch
      let end = idx + 1
      while (end < code.length) {
        if (code[end] === '\\') {
          end += 2
          continue
        }
        if (code[end] === quote) break
        end++
      }
      expr = code.slice(idx, end + 1)
    } else if (ch === '{') {
      const end = findMatchingDelimiter(code, idx, '{', '}')
      if (end !== -1) expr = code.slice(idx + 1, end)
    } else if (match[0].includes('(')) {
      // Backtrack to '(' of navigate(
      const openParen = code.indexOf('(', match.index)
      const closeParen = findMatchingDelimiter(code, openParen, '(', ')')
      if (closeParen !== -1) expr = code.slice(openParen + 1, closeParen)
    }

    if (!expr) continue

    // Find string/template literals inside expr (including ternaries / pathname: '...')
    const litRegex = /`([^`]*)`|'([^']*)'|"([^"]*)"/g
    let litMatch
    while ((litMatch = litRegex.exec(expr)) !== null) {
      const rawVal = litMatch[1] !== undefined
        ? replaceTemplateExpressions(litMatch[1])
        : (litMatch[2] ?? litMatch[3] ?? '')

      if (shouldCheckPath(rawVal)) {
        findings.push({
          file: path.relative(path.resolve(FRONTEND_DIR, '..'), filePath).replace(/\\/g, '/'),
          line: lineNumberAt(code, startIdx),
          raw: rawVal,
          normalized: normalizeRoute(rawVal),
        })
      }
    }
  }

  return findings
}

function extractBackendLinks(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8')
  const code = stripCommentsPreserveLines(raw)
  const findings = []
  const linkPropRegex = /\blink\s*:\s*/g
  let match

  while ((match = linkPropRegex.exec(code)) !== null) {
    let idx = match.index + match[0].length
    while (idx < code.length && /\s/.test(code[idx])) idx++
    const ch = code[idx]
    let rawVal = null

    if (ch === "'" || ch === '"') {
      let end = idx + 1
      while (end < code.length) {
        if (code[end] === '\\') {
          end += 2
          continue
        }
        if (code[end] === ch) break
        end++
      }
      rawVal = code.slice(idx + 1, end)
    } else if (ch === '`') {
      let end = idx + 1
      while (end < code.length) {
        if (code[end] === '\\') {
          end += 2
          continue
        }
        if (code[end] === '$' && code[end + 1] === '{') {
          end = findMatchingDelimiter(code, end + 1, '{', '}')
          if (end === -1) break
          end++
          continue
        }
        if (code[end] === '`') break
        end++
      }
      rawVal = replaceTemplateExpressions(code.slice(idx + 1, end))
    }

    if (rawVal && shouldCheckPath(rawVal)) {
      findings.push({
        file: path.relative(path.resolve(FRONTEND_DIR, '..'), filePath).replace(/\\/g, '/'),
        line: lineNumberAt(code, match.index),
        raw: rawVal,
        normalized: normalizeRoute(rawVal),
      })
    }
  }

  return findings
}

function main() {
  const routePatterns = loadRoutePatterns()
  const routeMatchers = routePatterns.map((p) => ({ pattern: p, regex: patternToRegex(p) }))

  const frontendFiles = walkFiles(FRONTEND_SRC, /\.(jsx?|tsx?)$/)
  const backendFiles = BACKEND_SCAN_DIRS.flatMap((d) => walkFiles(d, /\.(mjs|js)$/))

  const allLinks = [
    ...frontendFiles.flatMap(extractFrontendLinks),
    ...backendFiles.flatMap(extractBackendLinks),
  ]

  const broken = []
  for (const item of allLinks) {
    const matched = routeMatchers.some((m) => m.regex.test(item.normalized))
    if (!matched) {
      broken.push(item)
    }
  }

  if (broken.length > 0) {
    console.error(`\x1b[31mFAIL: check:links found ${broken.length} broken internal link(s) leading to NotFound:\x1b[0m`)
    for (const b of broken) {
      console.error(`  - ${b.file}:${b.line} -> "${b.raw}" (normalized: "${b.normalized}")`)
    }
    console.error(`\nValid routes (${routePatterns.length}): ${routePatterns.join(', ')}`)
    process.exit(1)
  }

  console.log(
    `\x1b[32mPASS: check:links verified ${allLinks.length} links across Frontend & Backend against ${routePatterns.length} routes. 0 broken links.\x1b[0m`
  )
}

main()
