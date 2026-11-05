export interface IProcessBulkOperation {
    /**
     * 
     * @param database nome do banco de dados sem [ `` ].
     * @param data dados a serem processados
     * @param source origem dos dados, Ex: api_internal.
     */
    execute(database:string, data: any[], source?: string  ):Promise<number>
}