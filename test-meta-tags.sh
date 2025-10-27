#!/bin/bash
# Test script to verify photo permalink meta tag injection

echo "🔍 Testing Photo Permalink Meta Tag Injection"
echo "=============================================="
echo ""

# Configuration
HOST="localhost"
PORT="3000"
ALBUM="nature"
PHOTO="00257-00040-Edit.jpg"
URL="http://${HOST}:${PORT}/album/${ALBUM}?photo=${PHOTO}"

echo "📸 Testing URL: ${URL}"
echo ""

# Check if server is running
if ! curl -s --head --fail "${URL}" > /dev/null 2>&1; then
    echo "❌ Error: Frontend server is not running on ${HOST}:${PORT}"
    echo "   Please start the server with: cd frontend && npm start"
    exit 1
fi

echo "✅ Server is running"
echo ""

# Fetch the HTML and extract meta tags
echo "📋 Extracting meta tags..."
echo ""

HTML=$(curl -s "${URL}")

# Function to extract meta tag content
extract_meta() {
    local property=$1
    echo "$HTML" | grep -o "property=\"${property}\" content=\"[^\"]*\"" | sed 's/.*content="\(.*\)"/\1/' || echo "Not found"
}

extract_meta_name() {
    local name=$1
    echo "$HTML" | grep -o "name=\"${name}\" content=\"[^\"]*\"" | sed 's/.*content="\(.*\)"/\1/' || echo "Not found"
}

# Check Open Graph tags
echo "🏷️  Open Graph Tags:"
echo "   og:title:       $(extract_meta "og:title")"
echo "   og:description: $(extract_meta "og:description")"
echo "   og:image:       $(extract_meta "og:image")"
echo "   og:url:         $(extract_meta "og:url")"
echo "   og:type:        $(extract_meta "og:type")"
echo ""

# Check Twitter tags
echo "🐦 Twitter Card Tags:"
echo "   twitter:title:  $(extract_meta "twitter:title")"
echo "   twitter:image:  $(extract_meta "twitter:image")"
echo ""

# Check if meta tags contain photo-specific content
OG_IMAGE=$(extract_meta "og:image")
if [[ "$OG_IMAGE" == *"thumbnail"* && "$OG_IMAGE" == *"${ALBUM}"* && "$OG_IMAGE" == *"${PHOTO}"* ]]; then
    echo "✅ SUCCESS: Meta tags are correctly injected!"
    echo "   The og:image tag contains the photo thumbnail URL"
    echo ""
    echo "🔗 Test this URL on social media debuggers:"
    echo "   Facebook: https://developers.facebook.com/tools/debug/"
    echo "   Twitter:  https://cards-dev.twitter.com/validator"
    echo ""
    exit 0
else
    echo "❌ FAILED: Meta tags do not appear to be photo-specific"
    echo "   Expected og:image to contain: /optimized/thumbnail/${ALBUM}/${PHOTO}"
    echo "   Found: ${OG_IMAGE}"
    echo ""
    echo "💡 Troubleshooting:"
    echo "   1. Check server logs for [Meta Injection] messages"
    echo "   2. Verify the URL format is correct: /album/{name}?photo={filename}"
    echo "   3. Try a hard refresh or clear browser cache"
    echo ""
    exit 1
fi

