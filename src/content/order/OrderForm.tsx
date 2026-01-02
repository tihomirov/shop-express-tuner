import { Component, resolve, dependency } from '../../at';
import { Order } from '../../types/order';
import { Copy } from '../copy/Copy';
import { OrderStore } from './order-store';
import { OrderDeliveryInfo } from './OrderDeliveryInfo';

const flexColumnStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '3px',
}

const containerStyle = {
  position: 'fixed',
  width: '400px',
  zIndex: '999999',
  right: '12px',
  top: '12px',
  fontSize: '12px',
  backgroundColor: 'lightyellow',
  borderRadius: '6px',
  padding: '6px',
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
}

export class OrderForm extends Component {
  @dependency()
  order?: Order;
  @resolve(OrderStore)
  private readonly _orderStore!: OrderStore;

  private _isDragging = false;
  private _offsetX: number | undefined;
  private _offsetY: number | undefined;

  private readonly _element = this.nativeElement('div').style(containerStyle).computedProps((element) => ({
    onmousemove: (e) => {
      if (this._isDragging && this._offsetX !== undefined && this._offsetY !== undefined) {
        element.style.left = (e.clientX - this._offsetX) + 'px';
        element.style.top = (e.clientY - this._offsetY) + 'px';
      }
    },
  }));

  private readonly _dragElement = this.nativeElement('div').style({
    position: 'absolute',
    width: '18px',
    height: '18px',
    right: '42px',
    top: '12px',
    cursor: 'move',
  }).props({
    innerHTML: '<svg xmlns="http://www.w3.org/2000/svg" class="svg-icon" viewBox="0 0 1025 1024" version="1.1"><path d="M585.074876 232.47085h-73.618434 237.427243L511.120686 0.743459 275.188355 232.47085h163.800816v216.122744H218.149858v143.479602h220.839313v216.906175h146.085705V592.073196h219.120563V448.593594h-219.120563V232.47085z m-73.906225 790.04115l219.983936-213.532629H292.91146l218.257191 213.524635zM0.740049 519.478017l217.409809 216.07478V305.113993L0.740049 519.478017z m803.45539-214.364024V735.544803l219.120564-216.07478-219.120564-214.364024z" fill="#333333"/></svg>',
    onmousedown: (e) => {
      this._isDragging = true;
      this._offsetX = e.clientX - this._element.getRenderItem().offsetLeft;
      this._offsetY = e.clientY - this._element.getRenderItem().offsetTop;
    },
    onmouseup: () => this._isDragging = false
  });

  private readonly _closeElement = this.nativeElement('div').style({
    position: 'absolute',
    width: '18px',
    height: '18px',
    right: '12px',
    top: '12px',
    cursor: 'pointer',
  }).props({
    innerHTML: '<svg xmlns="http://www.w3.org/2000/svg" class="svg-icon" viewBox="0 0 1024 1024" version="1.1"><path d="M 590.265 511.987 l 305.521 -305.468 c 21.617 -21.589 21.617 -56.636 0.027 -78.252 c -21.616 -21.617 -56.663 -21.617 -78.279 0 L 512.012 433.735 L 206.544 128.213 c -21.617 -21.617 -56.635 -21.617 -78.252 0 c -21.616 21.589 -21.616 56.635 -0.027 78.252 L 433.76 511.987 L 128.211 817.482 c -21.617 21.59 -21.617 56.635 0 78.251 c 10.808 10.81 24.967 16.213 39.125 16.213 c 14.159 0 28.318 -5.403 39.126 -16.213 l 305.522 -305.468 L 817.48 895.788 C 828.289 906.597 842.447 912 856.606 912 s 28.317 -5.403 39.125 -16.212 c 21.618 -21.59 21.618 -56.636 0.028 -78.252 L 590.265 511.987 Z" fill="#333333"/></svg>',
    onclick: () => {
      if (this.order) {
        this._orderStore.remove(this.order.id)
      }
    },
  });

  private readonly _itemList = this.nativeElement('ul').computedChilds(() =>
    this.order?.items.map(item => (
      this.nativeElement('li').style(flexColumnStyle).childs([
        this.nativeElement('span').computedProps(() => ({
          innerText: item.name
        })),
        this.nativeElement('span').computedProps(() => ({
          innerText: item.params
        })),
        this.nativeElement('span').computedProps(() => ({
          innerText: `Quantity: ${item.quantity}`
        })),
        this.nativeElement('span').computedProps(() => ({
          innerText: `${item.price}`
        })),
      ])
    )) ?? []
  );

  private readonly _clientInfo = this.nativeElement('div').style(flexColumnStyle).computedChilds(() => [
    this.component(Copy).props({
      children: [
        this.nativeElement('span').computedProps(() => ({
          innerText: `Delivery name: ${this.order?.client.name}`
        }))
      ],
      copyValue: this.order?.client.name
    }),
    this.component(Copy).props({
      children: [
        this.nativeElement('span').computedProps(() => ({
          innerText: `Delivery email: ${this.order?.client.email}`
        }))
      ],
      copyValue: this.order?.client.email
    }),
    this.component(Copy).props({
      children: [
        this.nativeElement('span').computedProps(() => ({
          innerText: `Delivery phone: ${this.order?.client.phone}`
        }))
      ],
      copyValue: this.order?.client.phone
    }),
  ]);

  childs() {
    return [
      this._element.childs([
        this._closeElement,
        this._dragElement,
        this._clientInfo,
        this.component(OrderDeliveryInfo).props({ order: this.order }),
        this._itemList,
      ]),
    ];
  }
}
