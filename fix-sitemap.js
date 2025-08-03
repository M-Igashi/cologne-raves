import fs from 'fs';
import path from 'path';

const distDir = './dist';
const sitemapIndexPath = path.join(distDir, 'sitemap-index.xml');
const sitemap0Path = path.join(distDir, 'sitemap-0.xml');
const sitemapPath = path.join(distDir, 'sitemap.xml');

try {
  // Check if sitemap-0.xml exists
  if (fs.existsSync(sitemap0Path)) {
    // Read the content of sitemap-0.xml
    const sitemapContent = fs.readFileSync(sitemap0Path, 'utf8');
    
    // Format the XML nicely
    const formattedContent = sitemapContent
      .replace(/><url>/g, '>\n  <url>')
      .replace(/<\/url><url>/g, '</url>\n  <url>')
      .replace(/<\/url><\/urlset>/g, '</url>\n</urlset>')
      .replace(/xmlns:news="[^"]*"/g, '\n    xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"')
      .replace(/xmlns:xhtml="[^"]*"/g, '\n    xmlns:xhtml="http://www.w3.org/1999/xhtml"')
      .replace(/xmlns:image="[^"]*"/g, '\n    xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"')
      .replace(/xmlns:video="[^"]*"/g, '\n    xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"')
      .replace(/<loc>/g, '\n    <loc>')
      .replace(/<\/loc>/g, '</loc>\n  ');
    
    // Write to sitemap.xml
    fs.writeFileSync(sitemapPath, formattedContent);
    
    // Remove sitemap-index.xml and sitemap-0.xml
    if (fs.existsSync(sitemapIndexPath)) {
      fs.unlinkSync(sitemapIndexPath);
    }
    fs.unlinkSync(sitemap0Path);
    
    console.log('✅ Single sitemap.xml created successfully');
  } else {
    console.log('⚠️  sitemap-0.xml not found, skipping sitemap consolidation');
  }
} catch (error) {
  console.error('❌ Error processing sitemap:', error.message);
}