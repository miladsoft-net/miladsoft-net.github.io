import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import type { Post } from '../../../content/config';
import { verifyDownloadToken } from '../../../services/downloadTokenService';

export const GET: APIRoute = async ({ params, url }) => {
  console.log('Received download request for slug:', params.slug); // Debug log

  try {
    const token = url.searchParams.get('token');
    const slug = params.slug;

    if (!slug) {
      return new Response('Invalid request', { status: 400 });
    }

    // Get post data
    const allPosts = await getCollection('posts');
    const post = allPosts.find((p: Post) => p.slug === slug);

    console.log('Found post:', post?.slug, 'downloadUrl:', post?.data?.downloadUrl); // Debug log

    if (!post?.data?.downloadUrl) {
      return new Response('File not found', { status: 404 });
    }

    // Check if content is free or requires token verification
    if (!post.data.isFree) {
      if (!token) {
        return new Response('Token required', { status: 401 });
      }
      
      const isValidToken = await verifyDownloadToken(token, slug);
      if (!isValidToken) {
        return new Response('Invalid or expired token', { status: 401 });
      }
    }

    try {
      console.log('Fetching file from:', post.data.downloadUrl); // Debug log
      const response = await fetch(post.data.downloadUrl);
      
      if (!response.ok) {
        console.error('Remote file fetch failed:', response.status, response.statusText); // Debug log
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }

      // Forward the response with original headers
      const blob = await response.blob();
      const headers = new Headers(response.headers);
      
      // Set required headers for download
      headers.set('Content-Type', response.headers.get('Content-Type') || 'application/octet-stream');
      headers.set('Content-Disposition', `attachment; filename="${post.slug}${getFileExtension(post.data.downloadUrl)}"`);
      
      return new Response(blob, {
        status: 200,
        headers: headers
      });

    } catch (error) {
      console.error('File fetch error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return new Response(`Failed to fetch file: ${errorMessage}`, { status: 500 });
    }

  } catch (error) {
    console.error('Download error:', error);
    return new Response('Internal server error', { status: 500 });
  }
};

// Helper function to get file extension
function getFileExtension(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const ext = pathname.split('.').pop();
    return ext ? `.${ext}` : '';
  } catch {
    return '';
  }
}
