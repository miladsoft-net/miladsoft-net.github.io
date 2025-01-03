import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { verifyDownloadToken } from '../../../services/downloadTokenService';

export const get: APIRoute = async ({ params, url }) => {
  try {
    const token = url.searchParams.get('token');
    const slug = params.slug;

    if (!token || !slug) {
      return new Response('Invalid request', { status: 400 });
    }

    // Verify token
    const isValidToken = await verifyDownloadToken(token, slug);
    if (!isValidToken) {
      return new Response('Invalid or expired token', { status: 401 });
    }

    // Get post data
    const allPosts = await getCollection('posts');
    const post = allPosts.find(p => p.slug === slug);

    if (!post?.data?.downloadUrl) {
      return new Response('File not found', { status: 404 });
    }

    // Fetch file from real URL
    const fileUrl = post.data.downloadUrl;
    const fileResponse = await fetch(fileUrl);

    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch file: ${fileResponse.statusText}`);
    }

    // Get filename from URL or post title
    const fileName = fileUrl.split('/').pop() || `${post.data.title}.zip`;
    const contentType = fileResponse.headers.get('content-type') || 'application/octet-stream';

    // Create response headers
    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Content-Disposition', `attachment; filename="${fileName}"`);

    // Add content length if available
    const contentLength = fileResponse.headers.get('content-length');
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    // Create response with file stream
    const streamResponse = new Response(fileResponse.body, {
      status: 200,
      headers: headers
    });

    return streamResponse;

  } catch (error) {
    console.error('Download error:', error);
    return new Response('Failed to process download', { status: 500 });
  }
};
