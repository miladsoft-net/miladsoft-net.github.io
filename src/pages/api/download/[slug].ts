import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import type { Post } from '../../../content/config';
import { verifyDownloadToken } from '../../../services/downloadTokenService';

export const GET: APIRoute = async ({ params, url }) => {
  try {
    const token = url.searchParams.get('token');
    const slug = params.slug;

    if (!slug) {
      return new Response('Invalid request', { status: 400 });
    }

    // Get post data
    const allPosts = await getCollection('posts');
    const post = allPosts.find((p: Post) => p.slug === slug);

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
      const response = await fetch(post.data.downloadUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }
      return response;

    } catch (error) {
      console.error('File fetch error:', error);
      return new Response('Failed to fetch file', { status: 500 });
    }

  } catch (error) {
    console.error('Download error:', error);
    return new Response('Internal server error', { status: 500 });
  }
};
