export type typeBranchesCompany = {
    codigo: number;
    nome_fantasia: string;
    razao_social: string;
    cnpj: string;
    ativo: 'S' | 'N';
};

export type NewBranchesCompany = Omit<typeBranchesCompany, 'codigo'>;