const Hapi = require('@hapi/hapi');
const ClientError = require('../../Commons/exceptions/ClientError');
const DomainErrorTranslator = require('../../Commons/exceptions/DomainErrorTranslator');
const users = require('../../Interfaces/http/api/users');
const authentications = require('../../Interfaces/http/api/authentications');

const createServer = async (container) => {
  const server = Hapi.server({
    host: process.env.HOST,
    port: process.env.PORT,
  });

  await server.register([
    {
      plugin: users,
      options: { container },
    },
    {
      plugin: authentications,
      options: { container },
    },
  ]);

  server.route({
    method: 'GET',
    path: '/',
    handler: () => ({
      value: 'Hello world!',
    }),
  });

  server.ext('onPreResponse', (request, h) => {
    const { response } = request;

    if (response instanceof Error) {
      const translatedError = DomainErrorTranslator.translate(response);

      if (translatedError instanceof ClientError) {
        const errorResponse = h.response({
          status: 'fail',
          message: translatedError.message,
        });
        errorResponse.code(translatedError.statusCode);
        return errorResponse;
      }

      if (!translatedError.isServer) {
        return h.continue;
      }

      const errorResponse = h.response({
        status: 'error',
        message: 'terjadi kegagalan pada server kami',
      });
      errorResponse.code(500);
      return errorResponse;
    }

    return h.continue;
  });

  return server;
};

module.exports = createServer;
