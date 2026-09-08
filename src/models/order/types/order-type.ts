export type OrderType = {
    codigo: number;
    id: string;
    id_externo: string;
    id_interno: string;
    vendedor: number;
    situacao:  'EA' | 'FI' | 'RE' | 'FP' | 'AI' | 'BM';
    situacao_separacao: 'N' | 'P' | 'I'  ;
    contato: string;
    descontos: string;
    frete: string;
    forma_pagamento: number;
    quantidade_parcelas: number;
    total_geral: string;
    total_produtos: string;
    total_servicos: string;
    cliente_id: string;
    cliente: number;
    cliente_nome: string,
    veiculo: number;
    data_cadastro: string;
    data_recadastro: string;
    tipo_os: number;
    enviado: 'S'| 'N';
    tipo: number;
    observacoes: string;
    operacao: 'V' | 'C' // venda ou compra
    fornecedor:number,
    setor: number;
    usuario: number;
    usuario_separacao: number;
    inicio_separacao:string
    fim_separacao:string
    status_separacao: 'NAO INICIADA' | 'EM ANDAMENTO' | 'PAUSADA' | 'RECUSADA' | 'CONCLUIDA'
    observacoes_separacao?: string | null
    filial:number
};

export type OrderReceivedType = {
    codigo?: number;
    id: string;
    id_externo?: string;
    id_interno?: string;
    vendedor?: number;
    situacao?: 'EA' | 'FI' | 'RE' | 'FP' | 'AI' | 'BM';
    situacao_separacao: 'N' | 'P' | 'I'  ;
    contato?: string;
    descontos?: string;
    frete?: string;
    cliente_id?: string;
    cliente_nome?: string,
    forma_pagamento?: number;
    quantidade_parcelas?: number;
    total_geral?: string;
    total_produtos?: string;
    total_servicos?: string;
    totalSemDesconto?: string;
    operacao: 'V' | 'C' // venda ou compra
    setor?: number;
    usuario: number;
    usuario_separacao: number;
    inicio_separacao:string
    fim_separacao:string
    status_separacao: 'NAO INICIADA' | 'EM ANDAMENTO' | 'PAUSADA' | 'RECUSADA' | 'CONCLUIDA'
    observacoes_separacao?: string | null
    fornecedor?: {
         codigo: number;
         nome?: string;
    }

    cliente?: {
        codigo: number;
        nome?: string;
    };
    veiculo?: number;
    data_cadastro?: string;
    data_recadastro?: string;
    tipo_os?: number;
    enviado?: 'S' | 'N';
    tipo?: number;
    observacoes?: string;
    observacoes2?: string;
    just_ipi?: string;
    just_icms?: string;
    just_subst?: string;
    produtos: ProductOrderType[];
    servicos: ServiceOrderType[];
    parcelas: ParcelOrderType[];
    filial:number
}
;

export type OrderSeriesType = {
    lote_serie: number;
    quantidade: number;
    serie?: string;
    lote?: string;
};

export type ProductOrderType = {
    codigo: number;
    preco: number;
    id?: string;
    sequencia:number;
    quantidade: number;
    desconto: number;
    total: number;
    frete?: number;
    descricao?: string;
    quantidade_separada?: number;
    quantidade_faturada?: number;
    series?: OrderSeriesType[];
    dados_setor?:dados_setor[]
};

    type dados_setor =
         {
            setor: string,
            local_produto: string,
            local1_produto:string,
            local2_produto:string,
            local3_produto:string,
            local4_produto:string,
            estoque: number,
        } 
 
export type ServiceOrderType = {
    codigo: number;
    quantidade: number;
    desconto: number;
    total: number;
    valor: number;
    id: string;

};

export type ParcelOrderType = {
    pedido: number;
    parcela: number;
    valor: number;
    vencimento: string;
};
