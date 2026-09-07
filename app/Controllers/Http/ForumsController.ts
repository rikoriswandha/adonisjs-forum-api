import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import Forum from "App/Models/Forum";
import Logger from "@ioc:Adonis/Core/Logger";
import Cache from "@ioc:Kaperskyguru/Adonis-Cache";

export default class ForumsController {
  public async test({}: HttpContextContract) {
    Logger.info("Forums retrieved successfully");

    return {
      hello: "world",
    };
  }

  public async index({ logger }: HttpContextContract) {
    const forums = await Forum.query().preload("user").preload("posts");
    logger.info("Forums retrieved successfully");
    return forums;
  }

  public async indexWithoutCache({}: HttpContextContract) {
    return await Forum.query().preload("user").preload("posts");
  }

  public async show({ params }: HttpContextContract) {
    const forum = await Forum.findOrFail(params.id);
    await forum.preload("user");
    await forum.preload("posts");
    return forum;
  }

  public async update({ auth, request, params }: HttpContextContract) {
    const user = await auth.authenticate();
    const forum = await Forum.query()
      .where("user_id", user.id)
      .where("id", params.id)
      .firstOrFail();
    forum.title = request.input("title");
    forum.description = request.input("description");
    await forum.save();
    await Cache.delete("forum_id_" + params.id);
    await forum.preload("user");
    await forum.preload("posts");
    return forum;
  }

  public async store({ auth, request }: HttpContextContract) {
    const user = await auth.authenticate();
    const forum = new Forum();
    forum.title = request.input("title");
    forum.description = request.input("description");
    await user.related("forums").save(forum);
    if (forum) {
      Logger.info({ ForumId: forum.id }, `Forum created successfully`);
      await Cache.set("forum_id_" + forum.id, forum, 60);
      return forum;
    }
    Logger.info({ Forum: forum }, `Forum not created`);
    return;
  }

  public async destroy({ auth, params, response }: HttpContextContract) {
    const user = await auth.authenticate();
    const forum = await Forum.query()
      .where("user_id", user.id)
      .where("id", params.id)
      .firstOrFail();
    await forum.delete();
    await Cache.delete("forum_id_" + params.id);
    return response.noContent();
  }
}
