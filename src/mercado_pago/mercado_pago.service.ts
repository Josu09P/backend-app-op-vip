import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { AxiosError, AxiosResponse } from 'axios';
import { catchError, firstValueFrom, map, Observable } from 'rxjs';
import { identification_type } from './models/identification_type';
import { MERCADO_PAGO_API, MERCADO_PAGO_HEADERS } from 'src/config/config';
import { Installment } from './models/installment';
import { CardTokenBody } from './models/card_token_body';
import { CardTokenResponse } from './models/card_token_response';
import { PaymentBody } from './models/payment_body';
import { InjectRepository } from '@nestjs/typeorm';
import { Order } from 'src/orders/order.entity';
import { OrderHasProducts } from 'src/orders/order_has_products.entity';
import { DataSource, Repository } from 'typeorm';
import { PaymentResponse } from './models/payment_response';
import { Stock } from 'src/stock/stock.entity';

@Injectable()
export class MercadoPagoService {
  constructor(
    private readonly httpService: HttpService,
    private dataSource: DataSource,

    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,

    @InjectRepository(OrderHasProducts)
    private ordersHasProductsRepository: Repository<OrderHasProducts>,

    @InjectRepository(Stock)
    private stockRepository: Repository<Stock> // ✅ Correctamente separado
  ) {}

  getIdentificationTypes(): Observable<AxiosResponse<identification_type[]>> {
    return this.httpService
      .get(MERCADO_PAGO_API + '/identification_types', { headers: MERCADO_PAGO_HEADERS })
      .pipe(
        catchError((error: AxiosError) => {
          throw new HttpException(error.response.data, error.response.status);
        })
      )
      .pipe(map(resp => resp.data));
  }
  getInstallments(firstSixDigits: number, amount: number): Observable<Installment> {
    return this.httpService
      .get(
        MERCADO_PAGO_API + `/payment_methods/installments?bin=${firstSixDigits}&amount=${amount}`,
        { headers: MERCADO_PAGO_HEADERS }
      )
      .pipe(
        catchError((error: AxiosError) => {
          throw new HttpException(error.response.data, error.response.status);
        })
      )
      .pipe(map((resp: AxiosResponse<Installment>) => resp.data[0]));
  }
  createCardToken(cardTokenBody: CardTokenBody): Observable<CardTokenResponse> {
    return this.httpService
      .post(
        MERCADO_PAGO_API + `/card_tokens?public_key=TEST-1eb2af36-3c1f-410c-9288-0be2394e115b`,

        cardTokenBody,
        { headers: MERCADO_PAGO_HEADERS }
      )
      .pipe(
        catchError((error: AxiosError) => {
          throw new HttpException(error.response.data, error.response.status);
        })
      )
      .pipe(map((resp: AxiosResponse<CardTokenResponse>) => resp.data));
  }

  async createPayment(paymentBody: PaymentBody): Promise<SimplifiedPaymentResponse> {
    try {
      // 1. Extraer datos temporales
      const orderTemp = paymentBody.order;
      const orderProducts = paymentBody.order.products;
      delete paymentBody.order;

      // 2. Validar stock ANTES de pagar
      for (const product of orderProducts) {
        const stock = await this.stockRepository.findOne({
          where: { id_product: product.id },
        });

        if (!stock || stock.quantity < product.quantity) {
          throw new HttpException(
            `Stock insuficiente para el producto ${product.id}`,
            HttpStatus.BAD_REQUEST
          );
        }
      }

      // 3. Ejecutar el pago
      const paymentResponse = await firstValueFrom(
        this.httpService
          .post(MERCADO_PAGO_API + '/payments', paymentBody, {
            headers: MERCADO_PAGO_HEADERS,
          })
          .pipe(
            map((resp: AxiosResponse<PaymentResponse>) => resp.data),
            catchError((error: AxiosError) => {
              throw new HttpException(
                error.response?.data || 'Error en pago',
                error.response?.status || 500
              );
            })
          )
      );

      // 4. Verificar estado del pago
      if (paymentResponse.status !== 'approved') {
        throw new HttpException('El pago no fue aprobado', HttpStatus.BAD_REQUEST);
      }

      // 5. Crear orden y descontar stock
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        const newOrder = this.ordersRepository.create(orderTemp);
        const savedOrder = await queryRunner.manager.save(Order, newOrder);

        for (const product of orderProducts) {
          const stock = await queryRunner.manager.findOne(Stock, {
            where: { id_product: product.id },
          });

          // Aquí ya no necesitas volver a validar stock, solo descontarlo.
          stock.quantity -= product.quantity;
          stock.updated_at = new Date();
          await queryRunner.manager.save(Stock, stock);

          const relation = this.ordersHasProductsRepository.create({
            id_order: savedOrder.id,
            id_product: product.id,
            quantity: product.quantity,
          });

          await queryRunner.manager.save(OrderHasProducts, relation);
        }

        await queryRunner.commitTransaction();
      } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
      } finally {
        await queryRunner.release();
      }

      return this.simplifyPaymentResponse(paymentResponse);
    } catch (error) {
      throw error;
    }
  }

  private simplifyPaymentResponse(response: PaymentResponse): SimplifiedPaymentResponse {
    const simplified = {
      id: response.id,
      status: response.status,
      transaction_amount: response.transaction_amount,
      payment_method_id: response.payment_method_id,
      payer: { email: response.payer.email },
    };
    console.log('Respuesta simplificada:', simplified);
    return simplified;
  }
}
