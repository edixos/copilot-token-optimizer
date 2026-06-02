export const PACKAGE_NAME = '@edixos/copilot-token-optimizer';

export const COPILOT_IGNORE_PATH = '.copilotignore';
export const COPILOT_MD_PATH = '.github/copilot-instructions.md';

// Internal tool artifacts live in .cpto/ (not .github/)
export const CPTO_DIR = '.cpto';
export const COMMON_MISTAKES_PATH = '.cpto/COMMON_MISTAKES.md';
export const QUICK_START_PATH = '.cpto/QUICK_START.md';
export const ARCHITECTURE_MAP_PATH = '.cpto/ARCHITECTURE_MAP.md';
export const CORE_REFERENCE_FILES = [
  COMMON_MISTAKES_PATH,
  QUICK_START_PATH,
  ARCHITECTURE_MAP_PATH,
];

export const INSTRUCTIONS_DIR = '.github/instructions';
export const COMPLETIONS_DIR = '.cpto/completions';
export const SESSIONS_DIR = '.cpto/sessions';
export const SESSIONS_ACTIVE_DIR = '.cpto/sessions/active';
export const SESSIONS_ARCHIVE_DIR = '.cpto/sessions/archive';
export const TEMPLATES_DIR = '.cpto/templates';

// .github/hooks/ is for JSON manifests only
export const HOOKS_DIR = '.github/hooks';
// .github/scripts/copilot-hooks/ is for .sh bash scripts
export const HOOKS_SCRIPTS_DIR = '.github/scripts/copilot-hooks';

export const DOCS_INDEX_PATH = 'docs/INDEX.md';
export const WRITE_LOG_PATH = `${SESSIONS_DIR}/write-log.md`;

// Skills directories
export const SKILLS_LOCAL_DIR = '.github/skills';
export const SKILLS_GLOBAL_DIR = '~/.agents/skills'; // resolved at runtime with os.homedir()

// Patterns for scanning files that are auto-loaded by Copilot at session start.
// Limited to shallow docs paths (top-level + one-level subdirs) to avoid token bloat
// from large reference libraries under deep subdirectories like docs/resources/**.
export const AUTO_LOAD_PATTERNS = [
  '*.md',
  COPILOT_MD_PATH,
  ...CORE_REFERENCE_FILES,
  `${INSTRUCTIONS_DIR}/**/*.instructions.md`,
  'docs/*.md',         // top-level docs only
  'docs/*/*.md',       // one subdirectory deep (e.g. docs/learnings/topic.md)
];

// Glob pattern used by compress to discover deep docs that should be referenced
// via on-demand tool calls rather than auto-loaded at session start.
export const DOCS_DEEP_PATTERNS = ['docs/*/*/**/*.md', 'docs/*/**/*.md'];
// Patterns always excluded by default (applied on top of .copilotignore)
export const DOCS_DEFAULT_EXCLUDE_PATTERNS = [
  'docs/archive/**',
  `.cpto/completions/**`,
  `.cpto/sessions/**`,
  `.cpto/templates/**`,
];

export const WATCHED_FILES = [
  { rel: COPILOT_MD_PATH, target: 450 },
  { rel: COMMON_MISTAKES_PATH, target: 350 },
  { rel: QUICK_START_PATH, target: 100 },
  { rel: ARCHITECTURE_MAP_PATH, target: 150 },
  { rel: DOCS_INDEX_PATH, target: null },
];