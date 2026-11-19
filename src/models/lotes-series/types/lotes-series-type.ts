export type LotesSeriesType = {
    codigo: number;
    id: string | null;
    produto: number;
    lote: string | null;
    serie: string | null;
    data_cadastro: string;
    data_recadastro: string;
};

export type LotesSeriesInput = {
    codigo?: number;
    id?: string | null;
    produto: number;
    lote?: string | null;
    serie?: string | null;
    data_cadastro?: string;
    data_recadastro?: string;
};
