// 可愛 Q 版肉嘟嘟卡通手勢繪製模組 (呼應圖二風格：握拳 ✊ 與張開手掌 🖐️)

export class CartoonHands {
  /**
   * 繪製可愛卡通握拳 (Fist ✊)
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x 中心 X
   * @param {number} y 中心 Y
   * @param {number} size 縮放大小基準 (約 40~50)
   * @param {boolean} isLeft 是否為左手 (鏡像)
   */
  static drawFist(ctx, x, y, size = 44, isLeft = false) {
    ctx.save();
    ctx.translate(x, y);
    if (isLeft) ctx.scale(-1, 1);

    const outline = '#4a2c17';
    const skinFill = '#fff9f5';
    const shadowFill = '#fed7aa';
    const blush = 'rgba(251, 146, 60, 0.28)';

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 1. 手腕手臂基底
    ctx.beginPath();
    ctx.moveTo(-size * 0.45, size * 0.4);
    ctx.bezierCurveTo(-size * 0.55, size * 0.7, -size * 0.35, size * 0.85, -size * 0.1, size * 0.85);
    ctx.lineTo(size * 0.35, size * 0.85);
    ctx.bezierCurveTo(size * 0.55, size * 0.7, size * 0.45, size * 0.4, size * 0.35, size * 0.2);
    ctx.fillStyle = shadowFill;
    ctx.fill();

    // 2. 拳頭主體 (肉嘟嘟圓潤外框)
    ctx.beginPath();
    ctx.moveTo(-size * 0.45, size * 0.2);
    // 左外側到手指頂端
    ctx.bezierCurveTo(-size * 0.55, -size * 0.2, -size * 0.4, -size * 0.55, -size * 0.15, -size * 0.55);
    // 四指外緣 (4 個可愛小波浪)
    ctx.bezierCurveTo(0, -size * 0.58, size * 0.2, -size * 0.55, size * 0.42, -size * 0.35);
    // 右側到拇指
    ctx.bezierCurveTo(size * 0.58, -size * 0.15, size * 0.55, size * 0.2, size * 0.35, size * 0.4);
    // 底部返回
    ctx.bezierCurveTo(size * 0.1, size * 0.5, -size * 0.25, size * 0.45, -size * 0.45, size * 0.2);
    ctx.closePath();

    ctx.fillStyle = skinFill;
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = outline;
    ctx.stroke();

    // 3. 握起的四指縫隙與凹痕 (捲入掌心的線條)
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = outline;

    // 食指到中指
    ctx.beginPath();
    ctx.moveTo(-size * 0.08, -size * 0.52);
    ctx.quadraticCurveTo(-size * 0.05, -size * 0.15, -size * 0.05, 0.05 * size);
    ctx.stroke();

    // 中指到無名指
    ctx.beginPath();
    ctx.moveTo(size * 0.15, -size * 0.5);
    ctx.quadraticCurveTo(size * 0.16, -size * 0.15, size * 0.15, 0.08 * size);
    ctx.stroke();

    // 拇指扣在前方
    ctx.beginPath();
    ctx.moveTo(-size * 0.42, 0);
    ctx.bezierCurveTo(-size * 0.3, 0.28 * size, 0.1 * size, 0.3 * size, size * 0.25, 0.1 * size);
    ctx.lineWidth = 3;
    ctx.stroke();

    // 4. 可愛指節粉嫩腮紅與高光
    ctx.fillStyle = blush;
    ctx.beginPath();
    ctx.arc(-size * 0.22, -size * 0.35, size * 0.12, 0, Math.PI * 2);
    ctx.arc(size * 0.04, -size * 0.35, size * 0.12, 0, Math.PI * 2);
    ctx.arc(size * 0.26, -size * 0.25, size * 0.11, 0, Math.PI * 2);
    ctx.fill();

    // 拇指高光
    ctx.beginPath();
    ctx.arc(-size * 0.12, 0.16 * size, size * 0.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * 繪製可愛卡通張開手掌 (Open Palm 🖐️)
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x 中心 X
   * @param {number} y 中心 Y
   * @param {number} size 縮放大小基準 (約 45~55)
   * @param {boolean} isLeft 是否為左手 (鏡像)
   */
  static drawOpenPalm(ctx, x, y, size = 48, isLeft = false) {
    ctx.save();
    ctx.translate(x, y);
    if (isLeft) ctx.scale(-1, 1);

    const outline = '#4a2c17';
    const skinFill = '#fff9f5';
    const blush = 'rgba(251, 146, 60, 0.3)';

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 繪製五指張開的連續輪廓
    ctx.beginPath();
    // 手掌左下角手腕
    ctx.moveTo(-size * 0.35, size * 0.5);

    // 拇指 (向左外展)
    ctx.bezierCurveTo(-size * 0.5, size * 0.35, -size * 0.72, size * 0.15, -size * 0.65, -0.05 * size);
    ctx.bezierCurveTo(-size * 0.6, -size * 0.18, -size * 0.42, -size * 0.12, -size * 0.32, 0.05 * size);

    // 食指
    ctx.bezierCurveTo(-size * 0.35, -size * 0.25, -size * 0.32, -size * 0.65, -size * 0.18, -size * 0.68);
    ctx.bezierCurveTo(-size * 0.05, -size * 0.7, -size * 0.05, -size * 0.35, -size * 0.05, -size * 0.18);

    // 中指 (最長)
    ctx.bezierCurveTo(-size * 0.03, -size * 0.45, 0, -size * 0.76, size * 0.12, -size * 0.76);
    ctx.bezierCurveTo(size * 0.24, -size * 0.76, size * 0.2, -size * 0.4, size * 0.18, -size * 0.16);

    // 無名指
    ctx.bezierCurveTo(size * 0.22, -size * 0.38, size * 0.28, -size * 0.66, size * 0.38, -size * 0.66);
    ctx.bezierCurveTo(size * 0.48, -size * 0.66, size * 0.44, -size * 0.32, size * 0.38, -size * 0.12);

    // 小指
    ctx.bezierCurveTo(size * 0.44, -size * 0.25, size * 0.56, -size * 0.48, size * 0.65, -size * 0.45);
    ctx.bezierCurveTo(size * 0.72, -size * 0.42, size * 0.66, -size * 0.12, size * 0.52, 0.08 * size);

    // 右手掌外緣回手腕
    ctx.bezierCurveTo(size * 0.52, size * 0.35, size * 0.4, size * 0.52, size * 0.22, size * 0.55);
    ctx.lineTo(-size * 0.22, size * 0.55);
    ctx.closePath();

    ctx.fillStyle = skinFill;
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = outline;
    ctx.stroke();

    // 掌心肉墊粉嫩腮紅
    ctx.fillStyle = blush;
    ctx.beginPath();
    ctx.ellipse(0, size * 0.16, size * 0.22, size * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();

    // 拇指根部小肉褶線條
    ctx.beginPath();
    ctx.arc(-size * 0.18, size * 0.22, size * 0.14, -Math.PI * 0.3, Math.PI * 0.4);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(74, 44, 23, 0.45)';
    ctx.stroke();

    ctx.restore();
  }
}
