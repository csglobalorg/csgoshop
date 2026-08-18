<?php
    if (!defined('PipraPay_INIT')) {
        http_response_code(403);
        exit('Direct access not allowed');
    }

    if(isset($_GET['receipt'])){
        pp_downloadReceiptPDF($data);
    }
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="author" content="Softnio">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <title><?php echo $data['lang']['checkout']?> - <?php echo $data['brand']['name'];?></title>
    <link rel="shortcut icon" href="<?php echo $data['brand']['favicon'];?>">
    <?php
       echo pp_assets('head');
    ?>

    <style>
        .container{
            max-width: 650px; 
            width: 100%;
        }
        .company-logo{
            margin-top: 15px;
            height: 50px;
            margin-bottom: 15px;
        }

        .btn-primary {
            --tblr-btn-border-color: transparent;
            --tblr-btn-hover-border-color: transparent;
            --tblr-btn-active-border-color: transparent;
            --tblr-btn-color: <?php echo $data['options']['text_color'];?>;
            --tblr-btn-bg: <?php echo $data['options']['primary_color'];?>;
            --tblr-btn-hover-color: <?php echo $data['options']['text_color'];?>;
            --tblr-btn-hover-bg: <?php echo pp_hexToRgba($data['options']['primary_color'], 0.80)?>;
            --tblr-btn-active-color: <?php echo $data['options']['text_color'];?>;
            --tblr-btn-active-bg: <?php echo pp_hexToRgba($data['options']['primary_color'], 0.80)?>;
            --tblr-btn-disabled-bg: <?php echo $data['options']['primary_color'];?>;
            --tblr-btn-disabled-color: <?php echo $data['options']['text_color'];?>;
            --tblr-btn-box-shadow: <?php echo $data['options']['text_color'];?>;
        }

    </style>

    <?php
        $seoTitle = trim($data['options']['seo_title'] ?? '');
        $seoDesc  = trim($data['options']['seo_description'] ?? '');
        $seoKey   = trim($data['options']['seo_keywords'] ?? '');
        $analyticsCode = trim($data['options']['analytics_code'] ?? '');

        if ($seoTitle !== '' && $seoTitle !== '--') {
            echo '<title>' . htmlspecialchars($seoTitle) . '</title>' . PHP_EOL;
            echo '<meta name="title" content="' . htmlspecialchars($seoTitle) . '">' . PHP_EOL;
            echo '<meta property="og:title" content="' . htmlspecialchars($seoTitle) . '">' . PHP_EOL;
        }

        if ($seoDesc !== '' && $seoDesc !== '--') {
            echo '<meta name="description" content="' . htmlspecialchars($seoDesc) . '">' . PHP_EOL;
            echo '<meta property="og:description" content="' . htmlspecialchars($seoDesc) . '">' . PHP_EOL;
        }

        if ($seoKey !== '' && $seoKey !== '--') {
            echo '<meta name="keywords" content="' . htmlspecialchars($seoKey) . '">' . PHP_EOL;
        }

        if ($analyticsCode !== '' && $analyticsCode !== '--') {
            echo $analyticsCode;
        }

        $bgStyle = 'background-color:#f8f9fa;';
        if (!empty($data['options']['enable_bg_image']) &&$data['options']['enable_bg_image'] === 'enabled' &&!empty($data['options']['background_image'])) {
            $bgImage = $data['options']['background_image'];
            $bgStyle = "
                background-image: url('{$bgImage}');
                background-size: cover;
                background-position: center;
                background-repeat: no-repeat;
                background-attachment: fixed;
            ";
        }
    ?>
</head>
<body style="<?= $bgStyle ?>" loading="lazy">
    <div class="container container-tight py-4">
        <div class="card">
            <div class="card-body text-center">

                <?php
                $status = strtolower($data['transaction']['status'] ?? 'pending');

                $statusMap = [
                    'completed' => ['text' => $data['lang']['payment_successful'], 'color' => 'success', 'icon' => 'check-circle-fill'],
                    'pending'   => ['text' => $data['lang']['payment_pending'], 'color' => 'warning', 'icon' => 'hourglass-split'],
                    'refunded'  => ['text' => $data['lang']['payment_refunded'], 'color' => 'info', 'icon' => 'arrow-counterclockwise'],
                    'canceled'  => ['text' => $data['lang']['payment_canceled'], 'color' => 'danger', 'icon' => 'x-circle-fill'],
                ];

                $currentStatus = $statusMap[$status] ?? $statusMap['pending'];
                ?>

                <div class="mb-4 mt-4">
                    <svg xmlns="http://www.w3.org/2000/svg" class="bi bi-<?php echo $currentStatus['icon']; ?> text-<?php echo $currentStatus['color']; ?>" width="80" height="80" fill="currentColor" viewBox="0 0 16 16">
                        <?php
                        switch($status){
                            case 'completed':
                                echo '<path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM6.97 11.03a.75.75 0 0 0 1.08 0l3.992-3.992a.75.75 0 1 0-1.06-1.06L7.5 9.439 5.97 7.97a.75.75 0 1 0-1.06 1.06l2.06 2.06z"/>';
                                break;
                            case 'pending':
                                echo '<path d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14zm0-1A6 6 0 1 1 8 2a6 6 0 0 1 0 12zm-.5-6V4h1v5h-1zm0 2h1v1h-1v-1z"/>';
                                break;
                            case 'refunded':
                                echo '<path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 0-.853-.521A4 4 0 1 1 8 4v1l2-2-2-2v1a5 5 0 0 0 0 10z"/>';
                                break;
                            case 'canceled':
                                echo '<path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM4.646 4.646a.5.5 0 0 0 0 .708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646a.5.5 0 0 0-.708 0z"/>';
                                break;
                        }
                        ?>
                    </svg>
                </div>

                <h2 class="text-<?php echo $currentStatus['color']; ?> mb-3"><?php echo $currentStatus['text']; ?></h2>
                <p class="text-muted mb-4">
                    <?php
                    switch($status){
                        case 'completed':
                            echo $data['lang']['change_status_completed'];
                            break;
                        case 'pending':
                            echo $data['lang']['change_status_pending'];
                            break;
                        case 'refunded':
                            echo $data['lang']['change_status_refunded'];
                            break;
                        case 'canceled':
                            echo $data['lang']['change_status_cancled'];
                            break;
                    }
                    ?>
                </p>

                <div class="table-responsive mb-4 <?php echo ($status == "canceled") ? 'd-none' : ''?>">
                    <table class="table table-bordered">
                        <tbody>
                            <tr>
                                <th><?php echo $data['lang']['payment_method']?></th>
                                <td><?php echo $data['transaction']['payment_method']?? 'N/A'; ?></td>
                            </tr>
                            <tr>
                                <th><?php echo $data['lang']['amount']?></th>
                                <td><?php echo money_round($data['transaction']['amount'] ?? 0, 2); ?> <?php echo $data['transaction']['currency'] ?? 'BDT'; ?></td>
                            </tr>
                            <tr>
                                <th><?php echo $data['lang']['discount']?></th>
                                <td><?php echo money_round($data['transaction']['discount_amount'] ?? 0, 2); ?> <?php echo $data['transaction']['currency'] ?? 'BDT'; ?></td>
                            </tr>
                            <tr>
                                <th><?php echo $data['lang']['processing_fee']?></th>
                                <td><?php echo money_round($data['transaction']['processing_fee'] ?? 0, 2); ?> <?php echo $data['transaction']['currency'] ?? 'BDT'; ?></td>
                            </tr>
                            <tr>
                                <th><?php echo $data['lang']['net_amount']?></th>
                                <td><?php echo money_round($data['transaction']['amount']-$data['transaction']['discount_amount']+$data['transaction']['processing_fee'] ?? 0, 2); ?> <?php echo $data['transaction']['currency'] ?? 'BDT'; ?></td>
                            </tr>
                            <tr>
                                <th><?php echo $data['lang']['net_local_amount']?></th>
                                <td><?php echo money_round($data['transaction']['local_net_amount'] ?? 0, 2); ?> <?php echo $data['transaction']['local_currency'] ?? 'BDT'; ?></td>
                            </tr>
                            <tr>
                                <th><?php echo $data['lang']['status']?></th>
                                <td><span class="text-<?php echo $currentStatus['color']; ?>"><?php echo ucfirst($status); ?></span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="mb-3">
                    <a href="<?php echo $data['transaction']['return_url']?>" class="btn btn-primary <?php echo ($data['transaction']['return_url'] == "--" || $data['transaction']['return_url'] == "") ? 'd-none' : ''?>"><?php echo $data['lang']['go_to_site']?></a>
                    <?php
                        if($status == "completed" || $status == "pending" || $status == "refunded"){
                    ?>
                           <a href="<?php echo pp_checkout_address();?>?receipt" class="btn btn-success"><?php echo $data['lang']['download_receipt']?></a>
                    <?php
                        }
                    ?>
                </div>

            </div>
        </div>

        <center class="footer-branding" style="margin-top: 20px;"><?php echo $data['options']['watermark_text'];?></center>
    </div>

    <?php
       echo pp_assets('footer');
    ?>
</body>
</html>