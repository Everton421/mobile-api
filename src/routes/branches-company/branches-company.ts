import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import z from 'zod';
import { SelectBranchesCampany } from '../../models/branches-company/select.ts';
import { InsertBranchesCompany } from '../../models/branches-company/insert.ts';
import { UpdateBranchesCompany } from '../../models/branches-company/update.ts';
import { DeleteBranchesCompany } from '../../models/branches-company/delete.ts';
import { SelectUserBranch } from '../../models/user-branch/select.ts';
import { InsertUserBranch } from '../../models/user-branch/insert.ts';
import { DeleteUserBranch } from '../../models/user-branch/delete.ts';
import { SelectUserCompany } from '../../models/user-company/select.ts';
import { DecodedToken } from '../../services/decoded-token/decodedToken.ts';
import { publishMessage } from '../../services/broker/publish-message.ts';

const filialSchema = z.object({
    codigo: z.coerce.number(),
    nome_fantasia: z.coerce.string(),
    razao_social: z.coerce.string(),
    cnpj: z.coerce.string(),
    ativo: z.enum(["S", "N"]).default('S')
});

export const branchesCompanyRoute: FastifyPluginAsyncZod = async (server) => {
  const getDbFromToken = (token: string) => {
    const decodedToken = DecodedToken(String(token));
    const cnpj = decodedToken.payload?.cnpj?.replace(/\D/g, '');
    return cnpj ? { cnpj, dbName: `\`${cnpj}\`` } : null;
  };

  server.get('/filiais/search', {
        schema:{
            tags:['filiais'],
             headers: z.object({
                token: z.string()
              }),
              querystring: z.object({
                    codigo: z.coerce.number().optional(),
                    nome_fantasia: z.coerce.string().optional(),
                    razao_social: z.coerce.string().optional(),
                    cnpj: z.coerce.string().optional(),
                    ativo: z.enum([ 'S' , 'N']).optional()
                   }),
                   response: {
                    200: z.array(filialSchema),
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
    }, 
    async ( request, reply )=>{
        const tenant = getDbFromToken(String(request.headers.token));
        if (!tenant) {
            return reply.status(400).send({ success: false, message: 'Token inválido' });
        }
        const { ativo, cnpj, codigo, nome_fantasia, razao_social } = request.query;
        const selectBranchesCampany = new SelectBranchesCampany();
        try{
            const dataBranches = await selectBranchesCampany.getByParams(tenant.dbName, { ativo, cnpj, codigo, nome_fantasia, razao_social });
            return reply.status(200).send(dataBranches);
        }catch(e){
          return reply.status(500).send({ success: false, message: `Erro ao tentar consultar filiais.`})
        }
    });
/*
  server.get('/filias/search', {
        schema:{
            tags:['filias'],
             headers: z.object({
                token: z.string()
              }),
              querystring: z.object({
                    codigo: z.coerce.number().optional(),
                    nome_fantasia: z.coerce.string().optional(),
                    razao_social: z.coerce.string().optional(),
                    cnpj: z.coerce.string().optional(),
                    ativo: z.enum([ 'S' , 'N']).optional()
                   }),
                   response: {
                    200: z.array(filialSchema),
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
    },
    async ( request, reply )=>{
        const tenant = getDbFromToken(String(request.headers.token));
        if (!tenant) {
            return reply.status(400).send({ success: false, message: 'Token inválido' });
        }
        const { ativo, cnpj, codigo, nome_fantasia, razao_social } = request.query;
        const selectBranchesCampany = new SelectBranchesCampany();
        try{
            const dataBranches = await selectBranchesCampany.getByParams(tenant.dbName, { ativo, cnpj, codigo, nome_fantasia, razao_social });
            return reply.status(200).send(dataBranches);
        }catch(e){
          return reply.status(500).send({ success: false, message: `Erro ao tentar consultar filiais.`})
        }
    });*/

  server.post('/filiais', {
    schema: {
        tags: ['filiais'],
        headers: z.object({
            token: z.string(),
            source: z.string().optional()
        }),
        body: z.object({
            nome_fantasia: z.string(),
            razao_social: z.string(),
            cnpj: z.string(),
            ativo: z.enum(['S', 'N']).default('S')
        }),
        response: {
            201: z.object({
                success: z.boolean(),
                message: z.string(),
                data: filialSchema
            }),
            400: z.object({ success: z.boolean(), message: z.string() })
        }
    }
  }, async (request, reply) => {
    const tenant = getDbFromToken(String(request.headers.token));
    if (!tenant) {
        return reply.status(400).send({ success: false, message: 'Token inválido' });
    }
    const source = request.headers.source as string || 'api_internal';
    const { nome_fantasia, razao_social, cnpj, ativo } = request.body;

    try {
        const insert = new InsertBranchesCompany();
        const result = await insert.insert(tenant.dbName, { nome_fantasia, razao_social, cnpj, ativo });
        const item = { codigo: result.insertId, nome_fantasia, razao_social, cnpj, ativo };
        await publishMessage(tenant.cnpj, 'filial.inserido', item, source);
        return reply.status(201).send({ success: true, message: 'Filial criada com sucesso', data: item });
    } catch (e) {
        console.error('Erro ao criar filial:', e);
        return reply.status(400).send({ success: false, message: 'Erro ao criar filial' });
    }
  });

  server.put('/filiais', {
    schema: {
        tags: ['filiais'],
        headers: z.object({
            token: z.string(),
            source: z.string().optional()
        }),
        body: z.object({
            codigo: z.number(),
            nome_fantasia: z.string(),
            razao_social: z.string(),
            cnpj: z.string(),
            ativo: z.enum(['S', 'N']).default('S')
        }),
        response: {
            200: z.object({
                success: z.boolean(),
                message: z.string(),
                data: filialSchema
            }),
            400: z.object({ success: z.boolean(), message: z.string() })
        }
    }
  }, async (request, reply) => {
    const tenant = getDbFromToken(String(request.headers.token));
    if (!tenant) {
        return reply.status(400).send({ success: false, message: 'Token inválido' });
    }
    const source = request.headers.source as string || 'api_internal';
    const { codigo, nome_fantasia, razao_social, cnpj, ativo } = request.body;

    const select = new SelectBranchesCampany();
    const existing = await select.findByCode(tenant.dbName, codigo);
    if (existing.length === 0) {
        return reply.status(400).send({ success: false, message: 'Filial não encontrada' });
    }

    try {
        const update = new UpdateBranchesCompany();
        const result = await update.update(tenant.dbName, { codigo, nome_fantasia, razao_social, cnpj, ativo });
        if (result.affectedRows > 0) {
            const item = { codigo, nome_fantasia, razao_social, cnpj, ativo };
            await publishMessage(tenant.cnpj, 'filial.atualizado', item, source);
            return reply.status(200).send({ success: true, message: 'Filial atualizada', data: item });
        }
        return reply.status(400).send({ success: false, message: 'Nenhuma alteração realizada' });
    } catch (e) {
        console.error('Erro ao atualizar filial:', e);
        return reply.status(400).send({ success: false, message: 'Erro ao atualizar filial' });
    }
  });

  server.delete('/filiais', {
    schema: {
        tags: ['filiais'],
        headers: z.object({
            token: z.string(),
            source: z.string().optional()
        }),
        querystring: z.object({
            codigo: z.coerce.number()
        }),
        response: {
            200: z.object({ success: z.boolean(), message: z.string() }),
            400: z.object({ success: z.boolean(), message: z.string() })
        }
    }
  }, async (request, reply) => {
    const tenant = getDbFromToken(String(request.headers.token));
    if (!tenant) {
        return reply.status(400).send({ success: false, message: 'Token inválido' });
    }
    const source = request.headers.source as string || 'api_internal';
    const { codigo } = request.query;

    const select = new SelectBranchesCampany();
    const existing = await select.findByCode(tenant.dbName, codigo);
    if (existing.length === 0) {
        return reply.status(400).send({ success: false, message: 'Filial não encontrada' });
    }

    try {
        const deleteUserBranch = new DeleteUserBranch();
        await deleteUserBranch.deleteByFilial(tenant.dbName, codigo);
        const deleteBranchesCompany = new DeleteBranchesCompany();
        await deleteBranchesCompany.delete(tenant.dbName, codigo);
        await publishMessage(tenant.cnpj, 'filial.deletado', { codigo }, source);
        return reply.status(200).send({ success: true, message: 'Filial deletada' });
    } catch (e) {
        console.error('Erro ao deletar filial:', e);
        return reply.status(400).send({ success: false, message: 'Erro ao deletar filial' });
    }
  });

  server.get('/filiais/usuario', {
    schema: {
        tags: ['filiais'],
        headers: z.object({
            token: z.string()
        }),
        response: {
            200: z.object({
                success: z.boolean(),
                filiais: z.array(filialSchema)
            }),
            400: z.object({ success: z.boolean(), message: z.string() }),
            500: z.object({ success: z.boolean(), message: z.string() })
        }
    }
  }, async (request, reply) => {
    const decodedToken = DecodedToken(String(request.headers.token));
    if (!decodedToken.payload?.cnpj) {
        return reply.status(400).send({ success: false, message: 'Token inválido' });
    }
    const empresa = decodedToken.payload.cnpj.replace(/\D/g, '');
    const dbName = `\`${empresa}\``;
    const codigoUsuario = decodedToken.payload.codigo;

    if (!codigoUsuario) {
        return reply.status(400).send({ success: false, message: 'Usuário não identificado' });
    }

    try {
        const selectUserBranch = new SelectUserBranch();
        const filiais = await selectUserBranch.findByUser(dbName, codigoUsuario);
        return reply.status(200).send({ success: true, filiais });
    } catch (e) {
        console.error('Erro ao buscar filiais do usuário:', e);
        return reply.status(500).send({ success: false, message: 'Erro ao buscar filiais do usuário' });
    }
  });

  server.get('/usuarios/:codigo/filiais', {
    schema: {
        tags: ['filiais'],
        headers: z.object({
            token: z.string()
        }),
        params: z.object({
            codigo: z.coerce.number()
        }),
        response: {
            200: z.object({
                success: z.boolean(),
                filiais: z.array(filialSchema)
            }),
            400: z.object({ success: z.boolean(), message: z.string() }),
            500: z.object({ success: z.boolean(), message: z.string() })
        }
    }
  }, async (request, reply) => {
    const tenant = getDbFromToken(String(request.headers.token));
    if (!tenant) {
        return reply.status(400).send({ success: false, message: 'Token inválido' });
    }
    const { codigo } = request.params;

    try {
        const selectUserCompany = new SelectUserCompany();
        const user = await selectUserCompany.findByCode(tenant.dbName, codigo);
        if (user.length === 0) {
            return reply.status(400).send({ success: false, message: 'Usuário não encontrado' });
        }

        const selectUserBranch = new SelectUserBranch();
        const filiais = await selectUserBranch.findByUser(tenant.dbName, codigo);
        return reply.status(200).send({ success: true, filiais });
    } catch (e) {
        console.error('Erro ao buscar filiais do usuário:', e);
        return reply.status(500).send({ success: false, message: 'Erro ao buscar filiais do usuário' });
    }
  });

  server.put('/usuarios/:codigo/filiais', {
    schema: {
        tags: ['filiais'],
        headers: z.object({
            token: z.string(),
            source: z.string().optional()
        }),
        params: z.object({
            codigo: z.coerce.number()
        }),
        body: z.object({
            filiais: z.array(z.number())
        }),
        response: {
            200: z.object({ success: z.boolean(), message: z.string() }),
            400: z.object({ success: z.boolean(), message: z.string() })
        }
    }
  }, async (request, reply) => {
    const tenant = getDbFromToken(String(request.headers.token));
    if (!tenant) {
        return reply.status(400).send({ success: false, message: 'Token inválido' });
    }
    const source = request.headers.source as string || 'api_internal';
    const { codigo } = request.params;
    const { filiais } = request.body;

    if (!Array.isArray(filiais)) {
        return reply.status(400).send({ success: false, message: 'Lista de filiais inválida' });
    }

    try {
        const selectUserCompany = new SelectUserCompany();
        const user = await selectUserCompany.findByCode(tenant.dbName, codigo);
        if (user.length === 0) {
            return reply.status(400).send({ success: false, message: 'Usuário não encontrado' });
        }

        const selectBranchesCampany = new SelectBranchesCampany();
        for (const codigoFilial of filiais) {
            const exists = await selectBranchesCampany.exists(tenant.dbName, codigoFilial);
            if (!exists) {
                return reply.status(400).send({ success: false, message: `Filial ${codigoFilial} não encontrada` });
            }
        }

        const deleteUserBranch = new DeleteUserBranch();
        await deleteUserBranch.deleteByUser(tenant.dbName, codigo);
        const insertUserBranch = new InsertUserBranch();
        await insertUserBranch.insert(tenant.dbName, codigo, filiais);

        await publishMessage(tenant.cnpj, 'usuario.filiais.atualizadas', { codigo, filiais }, source);
        return reply.status(200).send({ success: true, message: 'Filiais do usuário atualizadas' });
    } catch (e) {
        console.error('Erro ao atualizar filiais do usuário:', e);
        return reply.status(400).send({ success: false, message: 'Erro ao atualizar filiais do usuário' });
    }
  });
}