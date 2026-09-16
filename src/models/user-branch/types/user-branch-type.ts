import { type typeBranchesCompany } from "../../branches-company/types/typ-branches-company.ts";

export type UserBranchRow = typeBranchesCompany & {
    usuario: number;
};

export type UserCompanyWithFiliais = {
    codigo: number;
    nome: string;
    email: string;
    cnpj: string;
    responsavel: string;
    ativo: 'S' | 'N';
    codigo_perfil?: number;
    filiais: typeBranchesCompany[];
};