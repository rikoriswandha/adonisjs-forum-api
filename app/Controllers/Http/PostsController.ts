import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import Post from "App/Models/Post";

export default class PostsController {
  public async index() {
    const posts = await Post.query().preload("user").preload("forum");
    return posts;
  }

  public async show({ params }: HttpContextContract) {
    const post = await Post.findOrFail(params.id);
    await post.preload("user");
    await post.preload("forum");
    return post;
  }

  public async update({ auth, request, params }: HttpContextContract) {
    const user = await auth.authenticate();
    const post = await Post.query()
      .where("user_id", user.id)
      .where("id", params.id)
      .firstOrFail();
    post.title = request.input("title");
    post.content = request.input("content");
    await post.save();
    await post.preload("user");
    await post.preload("forum");
    return post;
  }

  public async store({ auth, request }: HttpContextContract) {
    const user = await auth.authenticate();
    const post = new Post();
    post.title = request.input("title");
    post.content = request.input("content");
    post.forumId = request.input("forum");
    await user.related("posts").save(post);
    return post;
  }

  public async destroy({ response, auth, params }: HttpContextContract) {
    const user = await auth.authenticate();
    const post = await Post.query()
      .where("user_id", user.id)
      .where("id", params.id)
      .firstOrFail();
    await post.delete();
    return response.noContent();
  }
}
