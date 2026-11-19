import fastifySwagger from "@fastify/swagger";
import scalarAPIReference from "@scalar/fastify-api-reference";
import fastify from "fastify";
import { jsonSchemaTransform, serializerCompiler, validatorCompiler, type ZodTypeProvider } from "fastify-type-provider-zod";
 
import fs from 'node:fs';
import path from 'node:path';
import { healthRoute } from "./routes/health/health.ts";
import { loginRoute } from "./routes/login/login.ts";
import { getBrandsRoute } from "./routes/brand/brand.ts";
import { getClientsRoute } from "./routes/client/client.ts";
import { getSuppliersRoute } from "./routes/supplier/supplier.ts";
import locationsRoute from "./routes/location/location.ts";
import paymentMethodsRoute from "./routes/payment-method/payment-method.ts";
import productMovementsRoute from "./routes/product-movement/product-movement.ts";
import productsRoute from "./routes/product/product.ts";
import productSectorRoute from "./routes/product-sector/product-sector.ts";
import sectorsRoute from "./routes/sector/sector.ts";
import { getServiceOrderTypesRoute } from "./routes/service-order-types/service-order-types.ts";
import servicesRoute from "./routes/service/service.ts";
import {usersRoute} from "./routes/user/user.ts";
import { getVehicleRoute } from "./routes/vehicle/vehicle.ts";
import { categoryRoute } from "./routes/category/category.ts";
import { photosRoute } from "./routes/photo/photo.ts";
import { ordersRoute } from "./routes/order/order.ts";
import orderSeriesRoute from "./routes/order/order-series.ts";
import { perfilRoute } from "./routes/perfil/perfil.ts";
 
import   cors   from '@fastify/cors'
import companyRoute from "./routes/company/company.ts";
import { mlIntegrationRoute } from "./modules/marketplaces/mercadolivre/routes/ml-integration.ts";
import { mlAccountsRoute } from "./modules/marketplaces/mercadolivre/routes/ml-accounts.ts";
import {    GetMlUserTestRoute } from "./modules/marketplaces/mercadolivre/routes/ml-get-user-test.ts";
import { mlAnunciosRoute } from "./modules/marketplaces/mercadolivre/routes/ml-anuncios.ts";
import { mlToolsRoute } from "./modules/marketplaces/mercadolivre/routes/ml-tools.ts";
import { marketplacesRoute } from "./routes/marketplaces/marketplace.ts";
import { mlAppAnunciosRoute } from "./modules/marketplaces/mercadolivre/routes/ml-app-anuncios.ts";
import { mlNotificationsRoute } from "./modules/marketplaces/mercadolivre/routes/ml-notifications.ts";
import { lotesSeriesRoute } from "./routes/lotes-series/lotes-series.ts";
import { loteSerieSetorRoute } from "./routes/lote-serie-setor/lote-serie-setor.ts";
import { branchesCompanyRoute } from "./routes/branches-company/branches-company.ts";
import requirementsRoute from "./routes/requirements/requirements.ts";
import webhookRoute from "./routes/webhook/webhook.ts";
let certPathEnv;
if(process.env.PATH_CERT_CERT) certPathEnv = String(process.env.PATH_CERT_CERT)

let keyPathEnv 
if(process.env.PATH_CERT_KEY) keyPathEnv = String(process.env.PATH_CERT_KEY)



   let dataServer:any = {
    logger:false 
    }

let httpsOptions ={}
if(  keyPathEnv && certPathEnv ){
    const keyPath = path.join(keyPathEnv);
    const certPath = path.join(certPathEnv);
    
    httpsOptions= {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
    }
    dataServer.https = httpsOptions;
}
    
 const server =fastify( dataServer ).withTypeProvider<ZodTypeProvider>()

//const server = fastify( ).withTypeProvider<ZodTypeProvider>()


if (!server) {
  throw new Error("Falha ao tentar configurar o servidor")

}

server.register(fastifySwagger, {
  openapi: {
    info: {
      title: "API Mobile",
      version: "1.0.0"
    }
  },
  transform: jsonSchemaTransform,
})


  server.register(cors,{
   origin:'*',
   methods:['GET','POST','PUT','DELETE','PATCH', 'OPTIONS'],
   allowedHeaders:'*',
   credentials: true,
   exposedHeaders:'*'

  })

 
server.register(scalarAPIReference, { routePrefix: '/docs' })

server.setSerializerCompiler(serializerCompiler);

server.setValidatorCompiler(validatorCompiler)



 server.register(healthRoute)
 server.register(loginRoute);
 server.register(usersRoute);
 server.register(companyRoute);
 server.register(categoryRoute);
 server.register(getServiceOrderTypesRoute);
 server.register(getVehicleRoute);
 server.register(sectorsRoute);
 server.register(servicesRoute);
 server.register(productsRoute);
 server.register(productSectorRoute);
 server.register(getClientsRoute);
 server.register(getSuppliersRoute);
 server.register(locationsRoute);
 server.register(getBrandsRoute);
 server.register(paymentMethodsRoute);
 server.register(productMovementsRoute); 
 server.register(photosRoute);
 server.register(ordersRoute);
 server.register(orderSeriesRoute);
 server.register(perfilRoute);
 server.register(lotesSeriesRoute);
 server.register(loteSerieSetorRoute);
// ml routes 
server.register(mlIntegrationRoute);
server.register(mlAnunciosRoute);
server.register(mlAppAnunciosRoute);
server.register(mlToolsRoute);
server.register(mlAccountsRoute);
server.register(marketplacesRoute);
server.register(GetMlUserTestRoute);
server.register(mlNotificationsRoute);
server.register(branchesCompanyRoute);
server.register(requirementsRoute);
server.register(webhookRoute);


 
export { server };
