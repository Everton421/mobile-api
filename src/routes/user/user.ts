import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import z from 'zod';
import { DecodedToken } from '../../services/decoded-token/decodedToken.ts';
import { SelectUserCompany } from '../../models/user-company/select.ts';
import { SelectUserBranch } from '../../models/user-branch/select.ts';
import { InsertUserApi } from '../../models/user-api/insert.ts';
import { InsertUserCompany } from '../../models/user-company/insert.ts';
import { PasswordService } from '../../services/password/password.ts';
import { type typeBranchesCompany } from '../../models/branches-company/types/typ-branches-company.ts';

type UserRow = {
    codigo: number;
    nome: string;
    email: string;
    cnpj: string;
    responsavel: string;
    ativo: string;
    codigo_perfil: number;
};

async function listUsersWithFiliais(dbName: string, users: UserRow[]): Promise<(UserRow & { filiais: typeBranchesCompany[] })[]> {
    if (users.length === 0) return [];

    const selectUserBranch = new SelectUserBranch();
    const rows = await selectUserBranch.findByUserIds(dbName, users.map(u => u.codigo));

    return users.map(u => ({
        ...u,
        filiais: rows
            .filter(r => r.usuario === u.codigo)
            .map(({ usuario, ...filial }) => filial)
    }));
}

const usersRoute: FastifyPluginAsyncZod = async (server) => {
    server.get('/bulk/usuarios', {
        schema: {
            tags: ['usuários'],
            headers: z.object({
                token: z.string()
            }),
            querystring: z.object({
                limit: z.coerce.number().optional()
            }),
            response: {
                200: z.array(z.object({
                    codigo: z.number(),
                    nome: z.string(),
                    email: z.string(),
                    cnpj: z.string(),
                    responsavel: z.string(),
                    ativo: z.string(),
                    codigo_perfil: z.number(),
                    filiais: z.array(z.object({
                        codigo: z.coerce.number(),
                        nome_fantasia: z.coerce.string(),
                        razao_social: z.coerce.string(),
                        cnpj: z.coerce.string(),
                        ativo: z.enum(["S", "N"])
                    }))
                })),
                400: z.object({
                    success: z.boolean(),
                    message: z.string()
                }),
                500: z.object({
                    success: z.boolean(),
                    message: z.string()
                })
            }
        }
    }, async (request, reply) => {
        const select = new SelectUserCompany();
        const decodedToken = DecodedToken(String(request.headers.token));
        const empresa = decodedToken.payload?.cnpj.replace(/\D/g, '');
        const dbName = `\`${empresa}\``;
        const { limit } = request.query;

        if (!dbName) {
            return reply.status(400).send({ success: false, message: 'Company identifier not provided' });
        }

        try {
            const result = await select.findAll(dbName, limit ?? 100);
            const resultWithFiliais = await listUsersWithFiliais(dbName, result);
            return reply.status(200).send(resultWithFiliais);
        } catch (e) {
            console.error('Error fetching users:', e);
            return reply.status(500).send({ success: false, message: 'Error fetching users' });
        }
    });

    server.get('/usuarios', {
        schema: {
            tags: ['usuários'],
            headers:z.object({
                token: z.string()
            })
        }
    }, async (request, reply) => {

        const selectUsersCompany = new SelectUserCompany();
                let decodToken = DecodedToken(String(request.headers.token))
                    //console.log(decodToken.payload?.codigo)
                    if(decodToken.payload?.codigo && decodToken.payload?.cnpj ){
                              const  dbName = `\`${decodToken.payload?.cnpj}\``;  // Usando o CNPJ formatado como nome do banco

                        const code = decodToken.payload?.codigo;
                            const resultUser = await  selectUsersCompany.findByCode(dbName, code)
                            if(resultUser.length >  0 ){
                                    const { codigo, email ,nome } = resultUser[0] 
                                return  reply.status(200).send({ codigo, email ,nome });

                                 }else{
                                return  reply.status(400).send({  sucess: false, message: "Usuário não foi  encontrado." });
                                  }


                    }
    });

    server.get('/usuarios/search', {
        schema: {
            tags: ['usuários'],
            headers: z.object({
                token: z.string()
            }),
            querystring: z.object({
                codigo: z.coerce.number().optional(),
                limit: z.coerce.number().optional(),
                email: z.coerce.string().optional(),
                nome: z.coerce.string().optional(),
                ativo: z.enum(["S", "N"]).optional(),
                search: z.coerce.string().optional()
            }),
            response: {
                200: z.array(z.object({
                    codigo: z.coerce.number(),
                    nome: z.coerce.string(),
                    email: z.coerce.string(),
                    cnpj: z.coerce.string(),
                    responsavel: z.coerce.string(),
                    ativo: z.coerce.string(),
                    filiais: z.array(z.object({
                        codigo: z.coerce.number(),
                        nome_fantasia: z.coerce.string(),
                        razao_social: z.coerce.string(),
                        cnpj: z.coerce.string(),
                        ativo: z.enum(["S", "N"])
                    }))
                })),
                400: z.object({
                    success: z.boolean(),
                    message: z.string()
                })
            }
        }
    }, async (request, reply) => {
        const select = new SelectUserCompany();
        const decodedToken = DecodedToken(String(request.headers.token));
        const empresa = decodedToken.payload?.cnpj.replace(/\D/g, '');
        const dbName = `\`${empresa}\``;

        if (!dbName) {
            return reply.status(400).send({ success: false, message: 'Company identifier not provided' });
        }
        const { codigo, email, limit,nome, ativo, search } = request.query;
        try {
            const result = await select.findByParams(dbName, { codigo, email, limit, nome, ativo, search });
            const resultWithFiliais = await listUsersWithFiliais(dbName, result);
            return reply.status(200).send(resultWithFiliais);
        } catch (e) {
            console.error('Error searching users:', e);
            return reply.status(400).send({ success: false, message: 'Error searching users' });
        }
    });

    server.post('/usuarios', {
        schema: {
            tags: ['usuários'],
            headers: z.object({
                token: z.string(),
                source: z.string().optional()
            }),
            body: z.object({
                nome: z.string(),
                email: z.string(),
                cnpj: z.string(),
                senha: z.string(),
                responsavel: z.string(),
                telefone: z.string(),
                ativo: z.enum(['S', 'N']).default('S'),
              codigo_perfil: z.number().optional().default(0)

            }),
            response: {
                200: z.object({
                    success: z.boolean(),
                    message: z.string(),
                    userApiCode: z.number(),
                    userCompanyCode: z.number()
                }),
                400: z.object({
                    success: z.boolean(),
                    message: z.string()
                })
            }
        }
    }, async (request, reply) => {
        const decodedToken = DecodedToken(String(request.headers.token));

        if (!decodedToken.payload?.cnpj) {
            return reply.status(400).send({ success: false, message: 'Company identifier not provided' });
        }

        const empresa = decodedToken.payload.cnpj.replace(/\D/g, '');
        const dbName = `\`${empresa}\``;
        const { nome, email, cnpj, senha, responsavel, telefone, ativo , codigo_perfil} = request.body;

        const insertUserApi = new InsertUserApi();
        const insertUserCompany = new InsertUserCompany();
        const passwordService = new PasswordService();

        try {
            const senhaHash = await passwordService.hash(senha);

            const resultUserApi = await insertUserApi.insert({ nome, email, cnpj, senha: senhaHash, responsavel, telefone });
            const userApiCode = resultUserApi.insertId;

            const resultUserCompany = await insertUserCompany.insert(dbName, { nome, email, cnpj, senha: senhaHash, responsavel, ativo , codigo_perfil});
            const userCompanyCode = resultUserCompany.insertId;

            return reply.status(200).send({
                success: true,
                message: 'User created successfully',
                userApiCode,
                userCompanyCode
            });
        } catch (e) {
            console.error('Error creating user:', e);
            return reply.status(400).send({ success: false, message: 'Error creating user' });
        }
    });
};

export { usersRoute };
export default usersRoute;
