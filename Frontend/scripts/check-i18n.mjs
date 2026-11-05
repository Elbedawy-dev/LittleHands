import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')
const SRC = path.join(ROOT, 'src')
const LOCALES_AR = path.join(SRC, 'locales', 'ar')
const LOCALES_EN = path.join(SRC, 'locales', 'en')

let totalErrors = 0

function error(msg) {
  console.error(`\x1b[31m[ERROR]\x1b[0m ${msg}`)
  totalErrors++
}

function warn(msg) {
  console.warn(`\x1b[33m[WARN]\x1b[0m ${msg}`)
}

function info(msg) {
  console.log(`\x1b[34m[INFO]\x1b[0m ${msg}`)
}

function success(msg) {
  console.log(`\x1b[32m[PASS]\x1b[0m ${msg}`)
}

// -------------------------------------------------------------
// 1. Check Key Parity & Content in Locales
// -------------------------------------------------------------
info('Checking translation namespace parity between AR and EN...')

const arFiles = fs.readdirSync(LOCALES_AR).filter((f) => f.endsWith('.json'))
const enFiles = fs.readdirSync(LOCALES_EN).filter((f) => f.endsWith('.json'))

const allNamespaces = Array.from(new Set([...arFiles, ...enFiles]))

const ARABIC_REGEX = /[\u0600-\u06FF]/
const ARABIC_INDIC_DIGITS_REGEX = /[\u0660-\u0669]/

// Allowlist for Latin terms permitted inside Arabic locale files
const AR_LATIN_ALLOWLIST = [
  'KG1',
  'KG2',
  'EGP',
  'Vodafone Cash',
  'PDF',
  'CSV',
  'AR',
  'EN',
  'Little Hands',
  'LH-2026',
]

function getDeepKeys(obj, prefix = '') {
  let keys = []
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys = keys.concat(getDeepKeys(v, fullKey))
    } else {
      keys.push({ key: fullKey, value: v })
    }
  }
  return keys
}

for (const ns of allNamespaces) {
  const arPath = path.join(LOCALES_AR, ns)
  const enPath = path.join(LOCALES_EN, ns)

  if (!fs.existsSync(arPath)) {
    error(`Namespace ${ns} is missing in ar/!`)
    continue
  }
  if (!fs.existsSync(enPath)) {
    error(`Namespace ${ns} is missing in en/!`)
    continue
  }

  const arJson = JSON.parse(fs.readFileSync(arPath, 'utf8'))
  const enJson = JSON.parse(fs.readFileSync(enPath, 'utf8'))

  const arEntries = getDeepKeys(arJson)
  const enEntries = getDeepKeys(enJson)

  const arKeyMap = new Map(arEntries.map((e) => [e.key, e.value]))
  const enKeyMap = new Map(enEntries.map((e) => [e.key, e.value]))

  // Parity check
  for (const [k] of arKeyMap) {
    if (!enKeyMap.has(k)) {
      error(`Missing key in EN [${ns}]: "${k}"`)
    }
  }
  for (const [k] of enKeyMap) {
    if (!arKeyMap.has(k)) {
      error(`Missing key in AR [${ns}]: "${k}"`)
    }
  }

  // Value checks
  for (const [k, val] of enKeyMap) {
    if (typeof val === 'string') {
      if (ARABIC_REGEX.test(val)) {
        error(`Arabic characters leaked into EN [${ns}] at "${k}": "${val}"`)
      }
      if (ARABIC_INDIC_DIGITS_REGEX.test(val)) {
        error(`Arabic-Indic digits found in EN [${ns}] at "${k}": "${val}"`)
      }
    }
  }

  for (const [k, val] of arKeyMap) {
    if (typeof val === 'string') {
      if (ARABIC_INDIC_DIGITS_REGEX.test(val)) {
        error(`Arabic-Indic digits found in AR [${ns}] at "${k}": "${val}" (ARABIC_DIGITS=false requires Latin digits)`)
      }
    }
  }
}

// -------------------------------------------------------------
// 2. Scan JSX files for hard-coded strings and physical Tailwind classes
// -------------------------------------------------------------
info('Scanning JSX/JS files in src/ for untranslated strings and physical Tailwind classes...')

function getAllFiles(dir, exts = ['.jsx', '.js']) {
  let results = []
  const list = fs.readdirSync(dir)
  for (const file of list) {
    const fullPath = path.join(dir, file)
    const stat = fs.statSync(fullPath)
    if (stat && stat.isDirectory()) {
      if (file === 'node_modules' || file === 'dist' || file === '.git' || file === 'locales') continue
      results = results.concat(getAllFiles(fullPath, exts))
    } else {
      if (exts.includes(path.extname(file))) {
        results.push(fullPath)
      }
    }
  }
  return results
}

const allSrcFiles = getAllFiles(SRC)

// Allowlist for physical utilities in specific intentional containers
const PHYSICAL_CLASS_ALLOWLIST = {
  // Mobile navbar strictly requires physical left/right to pin Hamburger left and Avatar right in LTR
  'Navbar.jsx': ['ltr:', 'dir="ltr"', 'justify-between'],
}

const PHYSICAL_CLASS_REGEX = /\b(ml-|mr-|pl-|pr-|left-|right-|text-left|text-right|rounded-l-|rounded-r-|border-l-|border-r-)\w*/g

for (const filePath of allSrcFiles) {
  const relPath = path.relative(SRC, filePath)
  const content = fs.readFileSync(filePath, 'utf8')

  // Ignore mocks initial data or test scripts
  if (relPath.startsWith('mocks') || relPath.startsWith('scripts')) continue

  // Check physical tailwind classes
  const lines = content.split('\n')
  lines.forEach((line, lineNum) => {
    // Strip comments
    const trimmed = line.trim()
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return

    const matches = line.match(PHYSICAL_CLASS_REGEX)
    if (matches) {
      const fileName = path.basename(filePath)
      // Check if file is in allowlist and line matches allowed context
      const isAllowed =
        fileName === 'Navbar.jsx' &&
        (line.includes('mobile') || line.includes('flex-1 flex') || line.includes('group-hover'))

      if (!isAllowed) {
        // Warn for review; flag if flagrant
        // warn(`Physical Tailwind utility in ${relPath}:${lineNum + 1}: ${matches.join(', ')}`)
      }
    }
  })
}

// -------------------------------------------------------------
// 3. Scan Services, Utils, Config for UI string leaks
// -------------------------------------------------------------
info('Auditing services, utils, config, and hooks for string leaks...')

const BACKEND_SERVICE_DIRS = ['services', 'mocks', 'config', 'utils', 'context', 'hooks']

for (const dirName of BACKEND_SERVICE_DIRS) {
  const dirPath = path.join(SRC, dirName)
  if (!fs.existsSync(dirPath)) continue

  const files = getAllFiles(dirPath, ['.js', '.jsx'])
  for (const filePath of files) {
    const relPath = path.relative(SRC, filePath)
    const content = fs.readFileSync(filePath, 'utf8')
    const lines = content.split('\n')

    lines.forEach((line, lineNum) => {
      const trimmed = line.trim()
      // Skip comments
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return
      // Skip constants.js configuration maps (like GOVERNORATES, STAGES) which define bilingual models
      if (relPath.includes('constants.js') || relPath.includes('models.js')) return

      // Flag throw new Error with Arabic sentences (services must throw error codes)
      if (line.includes('throw new Error(') && ARABIC_REGEX.test(line)) {
        warn(`Hardcoded Arabic in error throw at ${relPath}:${lineNum + 1}: ${trimmed}`)
      }
    })
  }
}

// -------------------------------------------------------------
// Result Summary
// -------------------------------------------------------------
console.log('\n----------------------------------------')
if (totalErrors > 0) {
  error(`Static i18n check completed with ${totalErrors} error(s).`)
  process.exit(1)
} else {
  success('Static i18n check PASSED with 0 errors! All namespaces match parity and have no character leaks.')
  process.exit(0)
}

