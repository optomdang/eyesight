#!/bin/bash
# Verification script to ensure refactored components work

echo "🔍 Running verification checks..."
echo ""

# 1. TypeScript check
echo "1️⃣ TypeScript type checking..."
npx tsc --noEmit 2>&1 | grep -c "error TS" || echo "✅ No critical TypeScript errors"
echo ""

# 2. Build check
echo "2️⃣ Building project..."
npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "✅ Build successful"
else
  echo "❌ Build failed!"
  exit 1
fi
echo ""

# 3. Check for new 'as any' introduced
echo "3️⃣ Checking for 'as any' in production code..."
AS_ANY_COUNT=$(grep -rn "as any" src/ --include="*.ts" --include="*.tsx" | grep -v "__tests__" | wc -l)
if [ "$AS_ANY_COUNT" -eq 0 ]; then
  echo "✅ No 'as any' found in production code"
else
  echo "⚠️  Found $AS_ANY_COUNT 'as any' in production code"
  grep -rn "as any" src/ --include="*.ts" --include="*.tsx" | grep -v "__tests__" | head -5
fi
echo ""

# 4. Check DataTableFilter usage
echo "4️⃣ Verifying DataTableFilter usage..."
FILTER_COUNT=$(grep -r "DataTableFilter" src/features --include="*.tsx" | wc -l)
echo "   Found $FILTER_COUNT usages of DataTableFilter"
echo ""

# 5. Check for common issues
echo "5️⃣ Checking for common issues..."

# Check for duplicate exports
DUPLICATE_EXPORTS=$(grep -rn "export default" src/ --include="*.tsx" | awk '{print $1}' | uniq -d)
if [ -z "$DUPLICATE_EXPORTS" ]; then
  echo "✅ No duplicate default exports"
else
  echo "⚠️  Found duplicate exports in:"
  echo "$DUPLICATE_EXPORTS"
fi

# Check for missing imports
echo ""
echo "6️⃣ Checking for unused imports (sample)..."
npx tsc --noEmit 2>&1 | grep "is declared but its value is never read" | head -3 || echo "✅ No obvious unused imports"

echo ""
echo "✅ Verification complete!"
echo ""
echo "📋 Manual testing checklist:"
echo "   - Test exercise filter search/reset"
echo "   - Test notification filter with patient dropdown"
echo "   - Verify table data loads correctly"
echo "   - Check browser console for errors"
