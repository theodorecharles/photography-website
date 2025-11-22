# Translation Workflow Guide

## 🌍 Complete Translation Management System

We have **3 scripts** that work together to manage translations across frontend and backend:

---

## 📝 Scripts Overview

### 1. **sync-translation-keys.js** - Propagate New Keys
```bash
node scripts/sync-translation-keys.js
```

**What it does:**
- Compares `en.json` with all other language files
- Finds keys that exist in English but are missing in other languages
- Adds missing keys with `[EN]` prefix automatically
- Works on **both** frontend (1124 keys) and backend (91 keys)

**Example Output:**
```
Backend Translations
  ✓ de.json - Added 3 missing key(s)
  ✓ es.json - Added 3 missing key(s)
  ✓ ja.json - Added 3 missing key(s)
  ... (18 files)

SUMMARY
Backend: 18/18 files modified, 54 keys added

✓ Added 54 missing key(s) across 18 file(s)
  Run 'node scripts/auto-translate.js' to translate the [EN] placeholders
```

---

### 2. **auto-translate.js** - Translate Placeholders
```bash
node scripts/auto-translate.js
```

**What it does:**
- Finds all strings with `[EN]` prefix
- Uses OpenAI GPT-4o to translate to each language
- Preserves variables `{{like}}`, HTML tags, formatting
- Batch processing (50 strings at a time)
- Works on **both** frontend and backend

**Requires:** OpenAI API key in `data/config.json` or `.env`

**Example Output:**
```
Backend Translations
  🌍 Translating Japanese (ja)...
    Found 3 placeholder(s) to translate
    ✓ Translated 3 string(s)
  
  🌍 Translating Spanish (es)...
    Found 3 placeholder(s) to translate
    ✓ Translated 3 string(s)

SUMMARY
Backend: 18/18 languages, 54 strings translated
```

---

### 3. **validate-translation-schema.js** - Verify Sync
```bash
node scripts/validate-translation-schema.js
```

**What it does:**
- Validates all language files have same structure as `en.json`
- Detects missing or extra keys
- Shows detailed report for each language
- Works on **both** frontend and backend

**Example Output:**
```
Frontend Translations
  ✓ de.json - OK (1124 keys)
  ✓ es.json - OK (1124 keys)
  ... (18 files)

Backend Translations
  ✓ ja.json - OK (91 keys)
  ... (18 files)

OVERALL SUMMARY
Frontend: ✓ VALID (18/18 files)
Backend: ✓ VALID (18/18 files)

✓ All 36 translation files are valid!
```

---

## 🔄 Complete Workflow

### When You Add New Features:

1. **Add English keys** to `frontend/src/i18n/locales/en.json` or `backend/src/i18n/locales/en.json`

2. **Sync keys** to other languages:
   ```bash
   node scripts/sync-translation-keys.js
   ```
   → Adds `[EN]` placeholders to all 18 languages

3. **Translate placeholders**:
   ```bash
   node scripts/auto-translate.js
   ```
   → OpenAI translates all `[EN]` strings

4. **Validate everything**:
   ```bash
   node scripts/validate-translation-schema.js
   ```
   → Confirms all files in sync

---

## ✨ Key Benefits

✅ **Fully Automatic** - No manual copying between files
✅ **Always In Sync** - Scripts ensure structure matches
✅ **18 Languages** - Instant translation to all languages
✅ **Frontend + Backend** - Complete coverage
✅ **Quality Control** - Validation catches issues
✅ **Version Control Friendly** - Clean diffs

---

## 📊 Current Translation Status

- **Frontend**: 1124 keys × 18 languages = 20,232 translations
- **Backend**: 91 keys × 18 languages = 1,638 translations
- **Total**: 21,870 translations across 36 files
- **Status**: ✅ All valid and in sync!

---

## 🎯 Best Practices

1. Always add English first (`en.json` is the source of truth)
2. Run `sync` immediately after adding English keys
3. Run `auto-translate` when you have OpenAI API key configured
4. Run `validate` before committing changes
5. Commit all language files together (atomic changes)

---

## 🔧 Troubleshooting

**Problem: Translations not working in app**
- Check `data/config.json` → `branding.language` setting
- Backend uses this global language for all emails/notifications

**Problem: Auto-translate fails**
- Ensure OpenAI API key is in `data/config.json`
- Or set `OPENAI_API_KEY` environment variable

**Problem: Validation fails**
- Run `sync-translation-keys.js` to fix structure
- Check for manual edits that broke JSON syntax

---

## 📚 Language Codes

- `en` - English
- `es` - Spanish
- `fr` - French
- `de` - German
- `ja` - Japanese
- `nl` - Dutch
- `it` - Italian
- `pt` - Portuguese
- `ru` - Russian
- `zh` - Chinese (Simplified)
- `ko` - Korean
- `pl` - Polish
- `tr` - Turkish
- `sv` - Swedish
- `no` - Norwegian
- `ro` - Romanian
- `tl` - Filipino (Tagalog)
- `vi` - Vietnamese
- `id` - Indonesian
